// Controller mengunggah Form Pemantauan (Lampiran 6) yang sudah bertanda tangan lengkap untuk pemantauan terakhir.
// Tanpa ini Initiator tidak bisa mencatat pemantauan berikutnya dan MOC tidak bisa lanjut ke Tinjauan Akhir.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mocRequests } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { attachMocEvidence, loadMocItem, recordMocHistory, requireMocAction } from "@/lib/api/moc";
import { monitoringEvidenceStage, mocUnsignedMonitoring } from "@/lib/domain/moc";

const bodySchema = z.object({ fileId: z.string().uuid() });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const moc = await requireMocAction(params.id, user, "signMonitoring");
    const { fileId } = bodySchema.parse(await req.json());
    const entry = mocUnsignedMonitoring(moc);
    if (!entry) throw new HttpError(409, "Tidak ada Form Pemantauan yang menunggu tanda tangan.");

    const ok = await attachMocEvidence(moc.id, "controller", fileId, user, undefined, monitoringEvidenceStage(entry.no));
    if (!ok) throw new HttpError(400, "Berkas tidak valid atau bukan unggahan Anda.");

    const closing = entry.outcome === "Tutup";
    if (closing) await db.update(mocRequests).set({ registerStatus: "Tinjauan Akhir", updatedAt: new Date() }).where(eq(mocRequests.id, moc.id));
    await recordMocHistory(moc.id, user, "Form Pemantauan Ditandatangani", {
      notes: `Form Pemantauan ke-${entry.no} bertanda tangan diunggah.${closing ? " Pemantauan ditutup, lanjut ke Tinjauan Akhir." : " Pemantauan berikutnya dapat dicatat Initiator."}`,
      ...(closing ? { fromState: moc.registerStatus, toState: "Tinjauan Akhir" } : {}),
    });
    return NextResponse.json(await loadMocItem(moc.id));
  });
}
