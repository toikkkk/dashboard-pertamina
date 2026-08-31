// Shared document query + mapping helpers, reused across every documents/* route.
// Maps DB rows onto the exact same DocumentItem/ApprovalRouteItem/HistoryItem shapes
// the frontend already speaks (see domain/types.ts) — this is what keeps the 16
// `usePsi()` consumers unchanged; only psiStore.tsx's internals swap from
// localStorage to these API responses.
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents, approvalRoutes, historyItems, historyDiffs, fileRegistry } from "@/lib/db/schema";
import { DocumentItem, ApprovalRouteItem, HistoryItem, SimulatedUser } from "@/lib/domain/types";
import type { SessionUser } from "@/lib/auth/session";

// Domain rule functions (canUserApproveDoc etc.) were written against the
// client-only SimulatedUser shape — this adapts a DB session row to that shape so
// the exact same rule logic runs server-side without duplicating it.
export function sessionUserToSimulated(u: SessionUser): SimulatedUser {
  return {
    id: u.id,
    name: u.name,
    role: u.role as SimulatedUser["role"],
    location: u.location,
    isRegionalAdmin: u.isRegionalAdmin,
    email: u.email,
  };
}

// A raw file_registry row is never handed to the client directly — every fileUrl
// the frontend sees is a route it can actually fetch/download through, RBAC-checked
// on each request (see /api/files/[fileId]/download/route.ts).
function fileDownloadUrl(fileId: string): string {
  return `/api/files/${fileId}/download`;
}

function toRouteItem(row: typeof approvalRoutes.$inferSelect): ApprovalRouteItem {
  return {
    approverRole: row.approverRole,
    approverName: row.approverName,
    stepOrder: row.stepOrder,
    status: row.status as ApprovalRouteItem["status"],
    actionDate: row.actionDate ?? undefined,
    comment: row.comment ?? undefined,
  };
}

function toHistoryItem(row: typeof historyItems.$inferSelect, diffs: (typeof historyDiffs.$inferSelect)[]): HistoryItem {
  return {
    id: row.id,
    timestamp: row.timestamp.toISOString().slice(0, 16).replace("T", " "),
    actorName: row.actorName,
    actorRole: row.actorRole,
    location: row.location,
    action: row.action as HistoryItem["action"],
    notes: row.notes ?? undefined,
    fileUrl: fileDownloadUrl(row.fileId),
    version: row.version,
    diff: diffs.length
      ? diffs.map((d) => ({ field: d.field, oldValue: d.oldValue, newValue: d.newValue }))
      : undefined,
  };
}

// Assembles one full DocumentItem from its document/routes/history rows — the
// N+1-per-document query pattern here is fine at this app's scale (tens, not
// thousands, of curated documents); the raw 2,970-file archive lives in
// file_registry and is never assembled into this shape (see /api/registry).
export async function loadDocumentItem(documentId: string): Promise<DocumentItem | null> {
  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  if (!doc) return null;

  const [routeRows, historyRows, [primaryFile]] = await Promise.all([
    db.select().from(approvalRoutes).where(eq(approvalRoutes.documentId, documentId)),
    db.select().from(historyItems).where(eq(historyItems.documentId, documentId)),
    db.select({ originalFilename: fileRegistry.originalFilename }).from(fileRegistry).where(eq(fileRegistry.id, doc.primaryFileId)).limit(1),
  ]);

  const historyIds = historyRows.map((h) => h.id);
  const diffRows = historyIds.length
    ? await db.select().from(historyDiffs).where(inArray(historyDiffs.historyItemId, historyIds))
    : [];

  return {
    id: doc.id,
    documentNumber: doc.documentNumber,
    title: doc.title,
    psiType: doc.psiType as DocumentItem["psiType"],
    auditType: doc.auditType as DocumentItem["auditType"],
    lifecyclePhase: doc.lifecyclePhase as DocumentItem["lifecyclePhase"],
    location: doc.location,
    currentVersion: doc.currentVersion,
    status: doc.status as DocumentItem["status"],
    issueDate: doc.issueDate,
    expiryDate: doc.expiryDate,
    fileUrl: fileDownloadUrl(doc.primaryFileId),
    fileName: primaryFile?.originalFilename,
    isCircular: doc.isCircular,
    routes: routeRows
      .sort((a, b) => a.stepOrder - b.stepOrder)
      .map(toRouteItem),
    history: historyRows
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map((h) => toHistoryItem(h, diffRows.filter((d) => d.historyItemId === h.id))),
  };
}

// RBAC-scoped list: non-admins only ever see documents at their own location —
// enforced here, server-side, superseding the client-only filter psiStore.tsx used
// to apply on its own (see AuthGuard/psiStore history in CLAUDE.md for why that was
// never sufficient once a real server existed to call directly).
export async function loadDocumentsForUser(user: SessionUser): Promise<DocumentItem[]> {
  const rows = user.isRegionalAdmin
    ? await db.select({ id: documents.id }).from(documents)
    : await db.select({ id: documents.id }).from(documents).where(eq(documents.location, user.location ?? ""));

  const items = await Promise.all(rows.map((r) => loadDocumentItem(r.id)));
  return items.filter((d): d is DocumentItem => d !== null);
}

export async function loadAllDocuments(): Promise<DocumentItem[]> {
  const rows = await db.select({ id: documents.id }).from(documents);
  const items = await Promise.all(rows.map((r) => loadDocumentItem(r.id)));
  return items.filter((d): d is DocumentItem => d !== null);
}

export async function getDocumentLocation(documentId: string): Promise<string | null> {
  const [doc] = await db.select({ location: documents.location }).from(documents).where(eq(documents.id, documentId)).limit(1);
  return doc?.location ?? null;
}
