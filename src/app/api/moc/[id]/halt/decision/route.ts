// Approver (atau Controller atas nama Approver tanpa akun) memutuskan pengajuan penundaan/penghentian.
// Disetujui -> MOC "halted"; ditolak -> kembali ke Pemantauan.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mocRequests } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { loadMocItem, recordMocHistory, requireMocAction, sessionUserToMocActor } from "@/lib/api/moc";
import { mocActionsFor, type MocHalt } from "@/lib/domain/moc";

const bodySchema = z.object({ decision: z.enum(["Disetujui", "Ditolak"]), note: z.string().trim().max(3000).default("") });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const { decision, note } = bodySchema.parse(await req.json());
    if (decision === "Ditolak" && !note) throw new HttpError(400, "Catatan wajib diisi bila ditolak.");
    const loaded = await loadMocItem(params.id);
    if (!loaded) throw new HttpError(404, "MOC tidak ditemukan.");
    const allowed = mocActionsFor(loaded, sessionUserToMocActor(user));
    const proxy = !allowed.includes("decideHalt") && allowed.includes("decideHaltProxy");
    const moc = await requireMocAction(params.id, user, proxy ? "decideHaltProxy" : "decideHalt");
    if (!moc.halt) throw new HttpError(409, "Tidak ada pengajuan penundaan/penghentian.");

    const halt: MocHalt = {
      ...moc.halt,
      decision,
      decisionNote: note,
      decidedByName: user.name,
      decidedAt: new Date().toISOString(),
      onBehalfOf: proxy ? moc.approverManualName ?? moc.approverName ?? null : null,
    };
    const next = decision === "Disetujui" ? "halted" : "registered";
    await db.update(mocRequests).set({ halt, validationState: next, updatedAt: new Date() }).where(eq(mocRequests.id, moc.id));
    await recordMocHistory(moc.id, user, "Penundaan/Penghentian Diputuskan", {
      notes: `${proxy ? `Dicatat Controller atas nama Approver ${halt.onBehalfOf ?? ""}. ` : ""}${decision}.${note ? ` ${note}` : ""}`.trim(),
      fromState: "halt_requested",
      toState: next,
    });
    return NextResponse.json(await loadMocItem(moc.id));
  });
}
