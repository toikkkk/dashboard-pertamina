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
import { hasMocRole, mocSubmitIssues } from "@/lib/domain/moc";

// Reviewer: akun terdaftar (userId) ATAU tanpa akun (manual + name). Approver: akun (approverUserId) ATAU manual.
const reviewerSchema = z
  .object({
    userId: z.string().uuid().optional(),
    manual: z.boolean().optional(),
    name: z.string().trim().max(200).optional(),
    functionLabel: z.string().trim().min(1).max(100),
    jabatan: z.string().trim().max(200).default(""),
  })
  .refine((r) => (r.manual ? !!r.name : !!r.userId && !!r.name?.trim()), { message: "Reviewer harus berupa akun terdaftar dengan nama pekerja, atau nama yang diketik manual." });

const bodySchema = z
  .object({
    reviewers: z.array(reviewerSchema).min(1).max(10),
    approverUserId: z.string().uuid().optional(),
    approverManual: z.object({ name: z.string().trim().min(1).max(200), jabatan: z.string().trim().max(200).default("") }).optional(),
    evidenceFileId: z.string().uuid().optional(),
  })
  .refine((b) => !!b.approverUserId !== !!b.approverManual, { message: "Pilih Approver dari akun terdaftar atau isi manual, salah satu saja." });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const moc = await requireMocAction(params.id, user, "submit");
    const { reviewers, approverUserId, approverManual, evidenceFileId } = bodySchema.parse(await req.json());

    const issues = mocSubmitIssues(moc, moc.location);
    if (issues.length > 0) throw new HttpError(400, "Formulir belum lengkap.", { issues });

    const accountReviewers = reviewers.filter((r) => !r.manual);
    const reviewerIds = accountReviewers.map((r) => r.userId as string);
    if (new Set(reviewerIds).size !== reviewerIds.length) {
      throw new HttpError(400, "Reviewer yang sama tidak boleh dipilih dua kali.");
    }
    // Reviewer & Approver dipilih manual, tetapi harus user terdaftar di lokasi MOC ini.
    const wanted = Array.from(new Set([...reviewerIds, ...(approverUserId ? [approverUserId] : [])]));
    const found = await db
      .select({ id: users.id, name: users.name, mocRoles: users.mocRoles, mocFunction: users.mocFunction })
      .from(users)
      .where(and(inArray(users.id, wanted), eq(users.location, moc.location)));
    if (found.length !== wanted.length) {
      throw new HttpError(400, "Reviewer dan Approver harus pengguna terdaftar di lokasi MOC ini.");
    }
    const nameOf = new Map(found.map((f) => [f.id, f.name]));
    // Dropdown di UI hanya menampilkan akun ber-peran yang sesuai; ini penjaga di server.
    const byId = new Map(found.map((f) => [f.id, f]));
    for (const r of accountReviewers) {
      const u = byId.get(r.userId as string);
      if (!u || !hasMocRole({ mocRoles: u.mocRoles as string[] }, "Reviewer")) {
        throw new HttpError(400, `${u?.name ?? "Pengguna"} belum ditetapkan sebagai MoC Reviewer. Minta Admin Regional mengatur Peran MOC di Kelola User.`);
      }
    }
    if (approverUserId) {
      const approver = byId.get(approverUserId);
      if (!approver || !hasMocRole({ mocRoles: approver.mocRoles as string[] }, "Approver")) {
        throw new HttpError(400, `${approver?.name ?? "Pengguna"} belum ditetapkan sebagai MoC Approver. Minta Admin Regional mengatur Peran MOC di Kelola User.`);
      }
    }

    const isFirst = moc.validationState === "draft";
    const round = isFirst ? moc.round : moc.round + 1;

    await db.insert(mocReviews).values(
      reviewers.map((r) => ({
        mocId: moc.id,
        round,
        functionLabel: r.functionLabel,
        reviewerUserId: r.manual ? null : (r.userId as string),
        // Reviewer akun peran boleh diberi nama orang (diketik Initiator); bila kosong dipakai nama akun.
        reviewerName: r.manual ? (r.name as string) : r.name?.trim() || (nameOf.get(r.userId as string) ?? ""),
        reviewerJabatan: r.jabatan || (r.manual ? "" : (byId.get(r.userId as string)?.mocFunction ?? "")),
      }))
    );
    await db
      .update(mocRequests)
      .set({
        validationState: "in_review",
        round,
        approverUserId: approverUserId ?? null,
        approverManualName: approverManual?.name ?? null,
        approverManualJabatan: approverManual?.jabatan ?? null,
        approverNote: null,
        updatedAt: new Date(),
      })
      .where(eq(mocRequests.id, moc.id));

    await recordMocHistory(moc.id, user, isFirst ? "Diajukan" : "Diperbarui Initiator", {
      notes: `Review putaran ${round}: ${reviewers.map((r) => `${r.functionLabel}${r.manual ? " (tanpa akun)" : ""}`).join(", ")}.${approverManual ? ` Approver tanpa akun: ${approverManual.name}.` : ""}`,
      fromState: moc.validationState,
      toState: "in_review",
    });
    await handleEvidence(moc.id, "initiator", evidenceFileId, user);

    return NextResponse.json(await loadMocItem(moc.id));
  });
}
