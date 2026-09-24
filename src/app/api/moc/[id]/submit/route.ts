// Initiator mengajukan MOC ke reviewer (Tahap A+B -> C). Dipakai untuk pengajuan
// pertama (draft), pengajuan ulang setelah dikembalikan reviewer (returned), dan
// setelah ditolak Approver (rejected) — dua terakhir memulai putaran review baru.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mocRequests, mocReviews, users } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { handleEvidence, loadMocItem, recordMocHistory, requireMocAction } from "@/lib/api/moc";
import { mocSubmitIssues } from "@/lib/domain/moc";

const bodySchema = z.object({
  reviewers: z
    .array(
      z.object({
        userId: z.string().uuid(),
        functionLabel: z.string().trim().min(1).max(100),
        jabatan: z.string().trim().max(200).default(""),
      })
    )
    .min(1)
    .max(10),
  approverUserId: z.string().uuid(),
  evidenceFileId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const moc = await requireMocAction(params.id, user, "submit");
    const { reviewers, approverUserId, evidenceFileId } = bodySchema.parse(await req.json());

    const issues = mocSubmitIssues(moc);
    if (issues.length > 0) throw new HttpError(400, "Formulir belum lengkap.", { issues });

    const reviewerIds = reviewers.map((r) => r.userId);
    if (new Set(reviewerIds).size !== reviewerIds.length) {
      throw new HttpError(400, "Reviewer yang sama tidak boleh dipilih dua kali.");
    }
    // Reviewer & Approver dipilih manual, tetapi harus user terdaftar di lokasi MOC ini.
    const wanted = Array.from(new Set([...reviewerIds, approverUserId]));
    const found = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(inArray(users.id, wanted), eq(users.location, moc.location)));
    if (found.length !== wanted.length) {
      throw new HttpError(400, "Reviewer dan Approver harus pengguna terdaftar di lokasi MOC ini.");
    }
    const nameOf = new Map(found.map((f) => [f.id, f.name]));

    const isFirst = moc.validationState === "draft";
    const round = isFirst ? moc.round : moc.round + 1;

    await db.insert(mocReviews).values(
      reviewers.map((r) => ({
        mocId: moc.id,
        round,
        functionLabel: r.functionLabel,
        reviewerUserId: r.userId,
        reviewerName: nameOf.get(r.userId) ?? "",
        reviewerJabatan: r.jabatan,
      }))
    );
    await db
      .update(mocRequests)
      .set({ validationState: "in_review", round, approverUserId, approverNote: null, updatedAt: new Date() })
      .where(eq(mocRequests.id, moc.id));

    await recordMocHistory(moc.id, user, isFirst ? "Diajukan" : "Diperbarui Initiator", {
      notes: `Review putaran ${round}: ${reviewers.map((r) => r.functionLabel).join(", ")}.`,
      fromState: moc.validationState,
      toState: "in_review",
    });
    await handleEvidence(moc.id, "initiator", evidenceFileId, user);

    return NextResponse.json(await loadMocItem(moc.id));
  });
}
