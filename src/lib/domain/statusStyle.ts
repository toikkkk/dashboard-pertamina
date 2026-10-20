// Centralized status → {label, color} lookups, replacing the ~9 independent copies
// of the same {color, tint} map that used to live inline in each component
// (directory page, ExpiringDocsTable, DocumentSplitViewer, ApprovalsPage,
// UpdateTypeBadge, ComplianceChart, UpcomingExpiryList, StatusOverview). Paired
// with <StatusTag> (src/components/StatusTag.tsx), which
// renders a small colored dash + neutral-ink label instead of a tinted pill —
// see KpiSummaryCards.tsx's own comment for the underlying principle ("text
// shouldn't wear the data color — only the mark should").

import type { DocumentStatus, LastUpdateType } from "./types";

export const DOCUMENT_STATUS_META: Record<DocumentStatus, { label: string; color: string }> = {
  Draft: { label: "Draft", color: "#6b6e72" },
  "In Routing": { label: "In Routing", color: "#B45309" },
  Approved: { label: "Approved", color: "#15803D" },
  "Revision Required": { label: "Revision Required", color: "#6D28D9" },
  Expired: { label: "Expired", color: "#DC2626" },
};

// UpdateTypeBadge previously rendered every value in the same flat neutral gray —
// this gives Baru/Direvisi/Diperpanjang genuine per-type color coding for the
// first time.
export const LAST_UPDATE_META: Record<LastUpdateType, { color: string }> = {
  Baru: { color: "#0F3B59" },
  Direvisi: { color: "#6D28D9" },
  Diperpanjang: { color: "#B45309" },
};

// Warna penanda untuk sub-status MOC (Tahap A-C). Palet status yang sama: hijau =
// selesai/terdaftar, amber = menunggu pihak lain, ungu = perlu direvisi, merah =
// ditolak, biru merek = menunggu keputusan berikutnya.
import { MOC_VALIDATION_STATE_LABEL, type MocValidationState } from "./moc";

export const MOC_STATE_META: Record<MocValidationState, { label: string; color: string }> = {
  draft: { label: MOC_VALIDATION_STATE_LABEL.draft, color: "#6b6e72" },
  in_review: { label: MOC_VALIDATION_STATE_LABEL.in_review, color: "#B45309" },
  returned: { label: MOC_VALIDATION_STATE_LABEL.returned, color: "#6D28D9" },
  pending_approval: { label: MOC_VALIDATION_STATE_LABEL.pending_approval, color: "#B45309" },
  rejected: { label: MOC_VALIDATION_STATE_LABEL.rejected, color: "#DC2626" },
  approved: { label: MOC_VALIDATION_STATE_LABEL.approved, color: "#0F3B59" },
  registered: { label: MOC_VALIDATION_STATE_LABEL.registered, color: "#15803D" },
  halt_requested: { label: MOC_VALIDATION_STATE_LABEL.halt_requested, color: "#B45309" },
  halted: { label: MOC_VALIDATION_STATE_LABEL.halted, color: "#6b6e72" },
};
