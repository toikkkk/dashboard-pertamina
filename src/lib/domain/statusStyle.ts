// Centralized status → {label, color} lookups, replacing the ~9 independent copies
// of the same {color, tint} map that used to live inline in each component
// (directory page, ExpiringDocsTable, DocumentSplitViewer, ApprovalsPage,
// RoutingStatusPanel, UpdateTypeBadge, ComplianceChart, UpcomingExpiryList,
// StatusOverview). Paired with <StatusTag> (src/components/StatusTag.tsx), which
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

// Route/approval-step status uses the same three colors as their DocumentStatus
// counterparts (Pending↔In Routing amber, Approved green, Rejected↔Expired red)
// so the dash language stays consistent between a document's own status and its
// per-approver step status.
export const ROUTE_STATUS_META: Record<"Pending" | "Approved" | "Rejected", { label: string; color: string }> = {
  Pending: { label: "Menunggu", color: "#B45309" },
  Approved: { label: "Disetujui", color: "#15803D" },
  Rejected: { label: "Ditolak", color: "#DC2626" },
};

// UpdateTypeBadge previously rendered every value in the same flat neutral gray —
// this gives Baru/Direvisi/Diperpanjang genuine per-type color coding for the
// first time.
export const LAST_UPDATE_META: Record<LastUpdateType, { color: string }> = {
  Baru: { color: "#0F3B59" },
  Direvisi: { color: "#6D28D9" },
  Diperpanjang: { color: "#B45309" },
};
