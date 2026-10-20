// Tahap D Komunikasi (TKO V-D): Initiator (atau Controller lokasi atas namanya) mencatat apa
// yang dikomunikasikan, lewat media apa, kapan, dan kepada siapa. Wajib sebelum Implementasi.
// Boleh dicatat ulang selama Implementasi belum dimulai (menimpa; tiap simpan masuk Riwayat).
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mocRequests } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { attachStageFiles, loadMocItem, mocCommunicationSchema, recordMocHistory, requireMocAction } from "@/lib/api/moc";
import { mocCommunicationIssues, type MocCommunication } from "@/lib/domain/moc";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const moc = await requireMocAction(params.id, user, "communicate");
    const { attachmentFileIds, ...input } = mocCommunicationSchema.parse(await req.json());

    const hasEvidence = attachmentFileIds.length > 0 || moc.evidence.some((e) => e.stage === "Komunikasi");
    const issues = mocCommunicationIssues(input, hasEvidence);
    if (issues.length > 0) throw new HttpError(400, "Catatan komunikasi belum lengkap.", { issues });

    const record: MocCommunication = { ...input, recordedById: user.id, recordedByName: user.name, recordedAt: new Date().toISOString() };
    await db.update(mocRequests).set({ communication: record, updatedAt: new Date() }).where(eq(mocRequests.id, moc.id));
    await recordMocHistory(moc.id, user, "Komunikasi Dicatat", {
      notes: `${moc.communication ? "Diperbarui. " : ""}${input.date} via ${input.media.join(", ")} kepada ${input.audience}.`,
    });
    await attachStageFiles(moc.id, attachmentFileIds, user, "Komunikasi");

    return NextResponse.json(await loadMocItem(moc.id));
  });
}
