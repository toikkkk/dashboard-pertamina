// Sub-kategori dokumen Direktori per lokasi (2026-09-28) — lihat memory
// project_directory_redesign_sub_categories / project_psi_document_scope untuk latar
// belakang. Logika status murni (dipakai klien & server, sama seperti domain/rules.ts).

export interface DocumentCategory {
  id: string;
  location: string;
  name: string;
  reviewCycleMonths: number;
  treatExpiryAsReviewOnly: boolean;
  isCustom: boolean;
}

// ✅ ada & masih berlaku · ❌ belum ada dokumen · 'expired' & 'review' sama-sama
// dirender dengan tanda 🟡 (client hanya minta 3 tanda) tapi label/arti beda —
// 'review' (OSCP) sengaja BUKAN "kedaluwarasa/overdue" seperti kategori lain.
export type CategoryDocStatus = "ok" | "missing" | "expired" | "review";

export const CATEGORY_STATUS_META: Record<CategoryDocStatus, { mark: string; label: string; color: string }> = {
  ok: { mark: "✅", label: "Ada & masih berlaku", color: "#15803D" },
  missing: { mark: "❌", label: "Belum ada dokumen", color: "#DC2626" },
  expired: { mark: "🟡", label: "Kedaluwarsa", color: "#B45309" },
  review: { mark: "🟡", label: "Perlu ditinjau ulang", color: "#B45309" },
};

// `doc` = dokumen TERBARU (issueDate paling baru) di kategori+lokasi ini, atau null
// kalau belum ada sama sekali. `now` bisa dioverride untuk pengujian.
export function categoryDocStatus(
  category: Pick<DocumentCategory, "reviewCycleMonths" | "treatExpiryAsReviewOnly">,
  doc: { issueDate: string } | null,
  now: Date = new Date()
): CategoryDocStatus {
  if (!doc) return "missing";
  const issue = new Date(`${doc.issueDate}T00:00:00`);
  if (isNaN(issue.getTime())) return "missing";
  const effectiveExpiry = new Date(issue);
  effectiveExpiry.setMonth(effectiveExpiry.getMonth() + category.reviewCycleMonths);
  if (effectiveExpiry.getTime() >= now.getTime()) return "ok";
  return category.treatExpiryAsReviewOnly ? "review" : "expired";
}
