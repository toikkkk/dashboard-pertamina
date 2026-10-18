// Controller memperbaiki nama pihak tanpa akun (reviewer yang belum menilai dan Approver manual) selama review
// atau persetujuan berjalan. Pihak berakun tidak bisa diganti di sini; pergantian itu lewat pengajuan ulang.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mocRequests, mocReviews } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { loadMocItem, recordMocHistory, requireMocAction } from "@/lib/api/moc";
import { reviewsOfCurrentRound } from "@/lib/domain/moc";

const bodySchema = z.object({
  reviewers: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(200),
        functionLabel: z.string().trim().min(1).max(100),
        jabatan: z.string().trim().max(200).default(""),
      })
    )
    .max(10)
    .default([]),
  approverManual: z.object({ name: z.string().trim().min(1).max(200), jabatan: z.string().trim().max(200).default("") }).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const moc = await requireMocAction(params.id, user, "editParties");
    const { reviewers, approverManual } = bodySchema.parse(await req.json());

    const editable = new Map(
      reviewsOfCurrentRound(moc)
        .filter((r) => !r.reviewerUserId && r.outcome === "Pending")
        .map((r) => [r.id, r])
    );
    const changes: string[] = [];
    for (const r of reviewers) {
      const cur = editable.get(r.id);
      if (!cur) throw new HttpError(409, "Hanya reviewer tanpa akun yang belum menilai yang dapat diubah.");
      if (cur.reviewerName === r.name && cur.functionLabel === r.functionLabel && cur.reviewerJabatan === r.jabatan) continue;
      await db
        .update(mocReviews)
        .set({ reviewerName: r.name, functionLabel: r.functionLabel, reviewerJabatan: r.jabatan })
        .where(and(eq(mocReviews.id, r.id), isNull(mocReviews.reviewerUserId), eq(mocReviews.outcome, "Pending")));
      changes.push(`Reviewer ${cur.reviewerName} → ${r.name} (${r.functionLabel})`);
    }
    if (approverManual) {
      if (moc.approverUserId || !moc.approverManualName) throw new HttpError(409, "Approver MOC ini adalah akun terdaftar.");
      if (moc.approverManualName !== approverManual.name || (moc.approverManualJabatan ?? "") !== approverManual.jabatan) {
        await db
          .update(mocRequests)
          .set({ approverManualName: approverManual.name, approverManualJabatan: approverManual.jabatan, updatedAt: new Date() })
          .where(eq(mocRequests.id, moc.id));
        changes.push(`Approver ${moc.approverManualName} → ${approverManual.name}`);
      }
    }
    if (changes.length > 0) {
      await recordMocHistory(moc.id, user, "Diperbarui Initiator", {
        notes: `Nama pihak tanpa akun diperbarui oleh ${user.name}: ${changes.join("; ")}.`,
        fromState: moc.validationState,
        toState: moc.validationState,
      });
    }
    return NextResponse.json(await loadMocItem(moc.id));
  });
}
