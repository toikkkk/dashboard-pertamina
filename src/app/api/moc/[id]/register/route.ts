// MoC Controller meregistrasi MOC yang sudah disetujui ke daftar MoC (TKO Tahap C,
// langkah 4) dan memberinya Nomor MoC. Format nomor belum didefinisikan TKO — bila
// tidak diisi, dipakai usulan MOC-<LOKASI>-<TAHUN>-<urut>, dapat diubah Controller.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, like } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mocRequests } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { handleEvidence, loadMocItem, recordMocHistory, requireMocAction } from "@/lib/api/moc";
import { suggestMocNumber } from "@/lib/domain/moc";

const bodySchema = z.object({
  mocNumber: z.string().trim().min(3).max(60).optional(),
  evidenceFileId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const moc = await requireMocAction(params.id, user, "register");
    const { mocNumber, evidenceFileId } = bodySchema.parse(await req.json().catch(() => ({})));

    let number = mocNumber;
    if (!number) {
      const year = new Date().getFullYear();
      const prefix = suggestMocNumber(moc.location, year, 0).replace(/-000$/, "-");
      const existing = await db.select({ n: mocRequests.mocNumber }).from(mocRequests).where(like(mocRequests.mocNumber, `${prefix}%`));
      number = suggestMocNumber(moc.location, year, existing.length + 1);
    }

    try {
      await db
        .update(mocRequests)
        .set({ mocNumber: number, validationState: "registered", updatedAt: new Date() })
        .where(eq(mocRequests.id, moc.id));
    } catch (err) {
      if (/duplicate key|unique/i.test(String((err as Error)?.message ?? err))) {
        throw new HttpError(409, `Nomor MoC ${number} sudah dipakai. Gunakan nomor lain.`);
      }
      throw err;
    }
    await recordMocHistory(moc.id, user, "Diregistrasi", {
      notes: `Nomor MoC ${number}.`,
      fromState: moc.validationState,
      toState: "registered",
    });
    await handleEvidence(moc.id, "controller", evidenceFileId, user);

    return NextResponse.json(await loadMocItem(moc.id));
  });
}
