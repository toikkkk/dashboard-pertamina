// Tahap G Tinjauan Akhir (Lampiran 7): Initiator pembuat MOC mengisi hasil tinjauan pasca-implementasi (4 pertanyaan,
// aksi tindak lanjut, tim peninjau). Setelah disimpan, setiap Reviewer dari putaran review terakhir diminta menanggapi
// (route final-review/review); bila ada yang meminta perubahan Initiator mengisi ulang. Penutupan oleh Approver baru
// terbuka setelah semua Reviewer Sesuai.
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mocRequests } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { attachStageFiles, isBlankTracked, loadMocItem, mocFinalReviewSchema, recordMocHistory, requireMocAction } from "@/lib/api/moc";
import { MOC_FINAL_QUESTIONS, mocFinalReviewIssues, wibYmd, type MocFinalResponse, type MocFinalReview } from "@/lib/domain/moc";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const moc = await requireMocAction(params.id, user, "finalReview");
    const { attachmentFileIds, ...parsed } = mocFinalReviewSchema.parse(await req.json());
    const input = {
      ...parsed,
      followUps: parsed.followUps.filter((r) => !isBlankTracked(r)),
      reviewers: parsed.reviewers.filter((r) => r.fungsi.trim() || r.keterangan.trim() || r.tanggapan.trim() || r.tanggal),
    };

    const issues = mocFinalReviewIssues(input, wibYmd(Date.now()));
    if (issues.length > 0) throw new HttpError(400, "Catatan tinjauan akhir belum lengkap.", { issues });

    // Reviewer yang diminta menanggapi = Reviewer pada putaran review terakhir (validasi).
    const lastRound = moc.reviews.reduce((m, r) => Math.max(m, r.round), 0);
    const responses: MocFinalResponse[] = moc.reviews
      .filter((r) => r.round === lastRound)
      .map((r) => ({ userId: r.reviewerUserId, name: r.reviewerName, fungsi: r.functionLabel, jabatan: r.reviewerJabatan, outcome: "Pending", note: "" }));

    const record: MocFinalReview = { ...input, responses, recordedById: user.id, recordedByName: user.name, recordedAt: new Date().toISOString() };
    await db.update(mocRequests).set({ finalReview: record, updatedAt: new Date() }).where(eq(mocRequests.id, moc.id));

    const tidak = input.answers.map((a, i) => (a.yes ? null : i + 1)).filter((n): n is number => n !== null);
    await recordMocHistory(moc.id, user, "Tinjauan Akhir Dicatat", {
      notes: `${moc.finalReview ? "Diperbarui. " : ""}Tinjauan ${input.date}: ${
        tidak.length === 0 ? `semua ${MOC_FINAL_QUESTIONS.length} pertanyaan dijawab Ya` : `pertanyaan ${tidak.join(", ")} dijawab Tidak`
      }. Menunggu review ${responses.length} Reviewer.`,
    });
    await attachStageFiles(moc.id, attachmentFileIds, user, "Tinjauan Akhir");
    return NextResponse.json(await loadMocItem(moc.id));
  });
}
