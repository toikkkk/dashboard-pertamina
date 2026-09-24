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
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const moc = await requireMocAction(params.id, user, "review");
    const { outcome, recommendation, evidenceFileId } = bodySchema.parse(await req.json());
    if (!recommendation) {
      throw new HttpError(400, "Catatan review wajib diisi.");
    }

    const mine = reviewsOfCurrentRound(moc).find((r) => r.reviewerUserId === user.id && r.outcome === "Pending");
    if (!mine) throw new HttpError(409, "Review Anda pada putaran ini sudah tercatat.");

    await db
      .update(mocReviews)
      .set({ outcome, recommendation, reviewedAt: new Date() })
      .where(and(eq(mocReviews.id, mine.id), eq(mocReviews.outcome, "Pending")));

    const after = reviewsOfCurrentRound({
      round: moc.round,
      reviews: moc.reviews.map((r) => (r.id === mine.id ? { ...r, outcome } : r)),
    });
    const resolution = resolveReviewRound(after);
    const nextState =
      resolution === "all_ok" ? "pending_approval" : resolution === "needs_changes" ? "returned" : moc.validationState;

    await recordMocHistory(moc.id, user, outcome === "Sesuai" ? "Review Sesuai" : "Review Perlu Perubahan", {
      notes: `${mine.functionLabel}${recommendation ? `: ${recommendation}` : ""}`,
      fromState: moc.validationState,
      toState: nextState,
    });
    if (nextState !== moc.validationState) {
      await db.update(mocRequests).set({ validationState: nextState, updatedAt: new Date() }).where(eq(mocRequests.id, moc.id));
    }
    await handleEvidence(moc.id, "reviewer", evidenceFileId, user, mine.id);

    return NextResponse.json(await loadMocItem(moc.id));
  });
}
