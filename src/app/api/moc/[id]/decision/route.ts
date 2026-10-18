// Keputusan MoC Approver (TKO Tahap C, langkah 3): setujui (+ menunjuk MoC Performer)
// atau tolak dengan catatan -> kembali ke Initiator.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mocRequests, users } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { handleEvidence, loadMocItem, recordMocHistory, requireMocAction } from "@/lib/api/moc";
import { hasMocRole } from "@/lib/domain/moc";

const bodySchema = z.object({
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().max(5000).default(""),
  performer: z.object({ userId: z.string().uuid().optional(), name: z.string().trim().min(1).max(200) }).optional(),
  evidenceFileId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const { decision, note, performer, evidenceFileId } = bodySchema.parse(await req.json());
    // Approver tanpa akun: keputusan dicatat Controller atas namanya (aksi decideProxy).
    const peek = await loadMocItem(params.id);
    const proxy = !!peek && !peek.approverUserId && !!peek.approverManualName;
    const moc = await requireMocAction(params.id, user, proxy ? "decideProxy" : "decide");
    const onBehalf = proxy ? ` (dicatat ${user.name} atas nama ${moc.approverManualName})` : "";

    if (!note) throw new HttpError(400, decision === "reject" ? "Catatan wajib diisi saat menolak." : "Catatan persetujuan wajib diisi.");
    if (decision === "reject") {
      await db
        .update(mocRequests)
        .set({ validationState: "rejected", approverNote: note, updatedAt: new Date() })
        .where(eq(mocRequests.id, moc.id));
      await recordMocHistory(moc.id, user, "Ditolak", { notes: `${note}${onBehalf}`, fromState: moc.validationState, toState: "rejected" });
    } else {
      if (!performer) throw new HttpError(400, "Tunjuk MoC Performer sebelum menyetujui.");
      let performerName = performer.name;
      if (performer.userId) {
        const [p] = await db
          .select({ name: users.name, mocRoles: users.mocRoles })
          .from(users)
          .where(and(eq(users.id, performer.userId), eq(users.location, moc.location)))
          .limit(1);
        if (!p) throw new HttpError(400, "Performer harus pengguna terdaftar di lokasi MOC ini.");
        if (!hasMocRole({ mocRoles: p.mocRoles as string[] }, "Performer")) {
          throw new HttpError(400, `${p.name} belum ditetapkan sebagai MoC Performer. Minta Admin Regional mengatur Peran MOC di Kelola User.`);
        }
        performerName = p.name;
      }
      await db
        .update(mocRequests)
        .set({
          validationState: "approved",
          performerUserId: performer.userId ?? null,
          performerName,
          approverNote: note || null,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(mocRequests.id, moc.id));
      await recordMocHistory(moc.id, user, "Disetujui", {
        notes: `Performer: ${performerName}.${note ? ` ${note}` : ""}${onBehalf}`,
        fromState: moc.validationState,
        toState: "approved",
      });
    }
    await handleEvidence(moc.id, "approver", evidenceFileId, user);

    return NextResponse.json(await loadMocItem(moc.id));
  });
}
