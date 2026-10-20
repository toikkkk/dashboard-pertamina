// Reviewer menilai MOC. Review PARALEL (keputusan meeting + TKO): semua reviewer pada
// putaran berjalan menilai tanpa saling menunggu. Bila semua selesai: semua "Sesuai"
// -> menunggu Approver; ada "Perlu Perubahan" -> kembali ke Initiator.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mocRequests, mocReviews } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { handleEvidence, loadMocItem, recordMocHistory, requireMocAction } from "@/lib/api/moc";
import { resolveReviewRound, reviewsOfCurrentRound } from "@/lib/domain/moc";

const bodySchema = z.object({
  outcome: z.enum(["Sesuai", "Perlu Perubahan"]),
  recommendation: z.string().trim().max(5000).default(""),
  evidenceFileId: z.string().uuid().optional(),
  // Diisi bila Initiator/Controller mencatat review atas nama reviewer tanpa akun.
  reviewId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const body = bodySchema.parse(await req.json());
    const { outcome, recommendation, evidenceFileId, reviewId } = body;
    const moc = await requireMocAction(params.id, user, reviewId ? "reviewProxy" : "review");
    if (!recommendation) {
      throw new HttpError(400, "Catatan review wajib diisi.");
    }

    const mine = reviewId
      ? reviewsOfCurrentRound(moc).find((r) => r.id === reviewId && !r.reviewerUserId && r.outcome === "Pending")
      : reviewsOfCurrentRound(moc).find((r) => r.reviewerUserId === user.id && r.outcome === "Pending");
    if (!mine) throw new HttpError(409, reviewId ? "Review untuk pihak tanpa akun ini sudah tercatat." : "Review Anda pada putaran ini sudah tercatat.");

    const updated = await db
      .update(mocReviews)
      .set({ outcome, recommendation, reviewedAt: new Date() })
      .where(and(eq(mocReviews.id, mine.id), eq(mocReviews.outcome, "Pending")))
      .returning({ id: mocReviews.id });
    if (updated.length === 0) throw new HttpError(409, "Review ini sudah tercatat. Muat ulang halaman.");

    // Hitung hasil putaran dari data TERBARU di database, bukan salinan di memori: bila dua reviewer menilai hampir
    // bersamaan, masing-masing akan melihat penilaian yang lain, sehingga MOC tidak macet di "menunggu review".
    const fresh = await db.select({ outcome: mocReviews.outcome, round: mocReviews.round }).from(mocReviews).where(and(eq(mocReviews.mocId, moc.id), eq(mocReviews.round, moc.round)));
    const after = reviewsOfCurrentRound({ round: moc.round, reviews: fresh as never });
    const resolution = resolveReviewRound(after);
    const nextState =
      resolution === "all_ok" ? "pending_approval" : resolution === "needs_changes" ? "returned" : moc.validationState;

    await recordMocHistory(moc.id, user, outcome === "Sesuai" ? "Review Sesuai" : "Review Perlu Perubahan", {
      notes: `${mine.functionLabel}${recommendation ? `: ${recommendation}` : ""}${reviewId ? ` (dicatat ${user.name} atas nama ${mine.reviewerName})` : ""}`,
      fromState: moc.validationState,
      toState: nextState,
    });
    if (nextState !== moc.validationState) {
      // Hanya bila masih di "in_review": mencegah penulisan ganda saat dua permintaan selesai bersamaan.
      await db.update(mocRequests).set({ validationState: nextState, updatedAt: new Date() }).where(and(eq(mocRequests.id, moc.id), eq(mocRequests.validationState, "in_review")));
    }
    await handleEvidence(moc.id, "reviewer", evidenceFileId, user, mine.id);

    return NextResponse.json(await loadMocItem(moc.id));
  });
}
