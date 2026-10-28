// Shared document query + mapping helpers, reused across every documents/* route.
// Maps DB rows onto the exact same DocumentItem/ApprovalRouteItem/HistoryItem shapes
// the frontend already speaks (see domain/types.ts) — this is what keeps the 16
// `usePsi()` consumers unchanged; only psiStore.tsx's internals swap from
// localStorage to these API responses.
import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents, approvalRoutes, historyItems, historyDiffs, fileRegistry, documentCategories } from "@/lib/db/schema";
import { DocumentItem, ApprovalRouteItem, HistoryItem, SimulatedUser } from "@/lib/domain/types";
import { canDeleteDocument } from "@/lib/domain/rules";
import { trashDaysLeft, trashPurgeAt, type TrashedDocument } from "@/lib/domain/trash";
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
    mocRoles: u.mocRoles as string[],
    mocFunction: u.mocFunction,
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

function toHistoryItem(
  row: typeof historyItems.$inferSelect,
  diffs: (typeof historyDiffs.$inferSelect)[],
  fileName: string | undefined
): HistoryItem {
  return {
    id: row.id,
    timestamp: row.timestamp.toISOString().slice(0, 16).replace("T", " "),
    actorName: row.actorName,
    actorRole: row.actorRole,
    location: row.location,
    action: row.action as HistoryItem["action"],
    notes: row.notes ?? undefined,
    fileUrl: fileDownloadUrl(row.fileId),
    fileName,
    version: row.version,
    diff: diffs.length
      ? diffs.map((d) => ({ field: d.field, oldValue: d.oldValue, newValue: d.newValue }))
      : undefined,
  };
}

// Assembles DocumentItems for a whole batch of document rows in a FIXED number of
// queries (4, regardless of how many documents) — replaces the old per-document
// N+1 loop (one loadDocumentItem() call per row via Promise.all), which was fine
// at this app's original scale but proved to genuinely fall over under concurrent
// load: a stress test with 120 simultaneous users hitting /api/bootstrap (36
// documents x ~5 queries each = ~180 queries PER request) drove Neon connection
// timeouts and a 98% failure rate (audit 2026-09-30). Mirrors the batched pattern
// loadMocList() in lib/api/moc.ts already used correctly.
async function assembleDocumentItems(docRows: (typeof documents.$inferSelect)[]): Promise<DocumentItem[]> {
  if (docRows.length === 0) return [];
  const docIds = docRows.map((d) => d.id);
  const primaryFileIds = docRows.map((d) => d.primaryFileId);

  const [routeRows, historyRows] = await Promise.all([
    db.select().from(approvalRoutes).where(inArray(approvalRoutes.documentId, docIds)),
    db.select().from(historyItems).where(inArray(historyItems.documentId, docIds)),
  ]);

  const historyIds = historyRows.map((h) => h.id);
  const allFileIds = Array.from(new Set([...primaryFileIds, ...historyRows.map((h) => h.fileId)]));
  const categoryIds = Array.from(new Set(docRows.map((d) => d.categoryId).filter((id): id is string => !!id)));

  const [diffRows, fileRows, categoryRows] = await Promise.all([
    historyIds.length ? db.select().from(historyDiffs).where(inArray(historyDiffs.historyItemId, historyIds)) : Promise.resolve([]),
    allFileIds.length
      ? db.select({ id: fileRegistry.id, originalFilename: fileRegistry.originalFilename }).from(fileRegistry).where(inArray(fileRegistry.id, allFileIds))
      : Promise.resolve([]),
    categoryIds.length
      ? db.select({ id: documentCategories.id, name: documentCategories.name }).from(documentCategories).where(inArray(documentCategories.id, categoryIds))
      : Promise.resolve([]),
  ]);

  const fileNameById = new Map(fileRows.map((f) => [f.id, f.originalFilename]));
  const categoryNameById = new Map(categoryRows.map((c) => [c.id, c.name]));
  const routesByDoc = new Map<string, typeof routeRows>();
  for (const r of routeRows) routesByDoc.set(r.documentId, [...(routesByDoc.get(r.documentId) ?? []), r]);
  const historyByDoc = new Map<string, typeof historyRows>();
  for (const h of historyRows) historyByDoc.set(h.documentId, [...(historyByDoc.get(h.documentId) ?? []), h]);
  const diffsByHistory = new Map<string, typeof diffRows>();
  for (const d of diffRows) diffsByHistory.set(d.historyItemId, [...(diffsByHistory.get(d.historyItemId) ?? []), d]);

  return docRows.map((doc) => ({
    id: doc.id,
    documentNumber: doc.documentNumber,
    title: doc.title,
    description: doc.deskripsi || undefined,
    psiType: doc.psiType as DocumentItem["psiType"],
    lifecyclePhase: doc.lifecyclePhase as DocumentItem["lifecyclePhase"],
    location: doc.location,
    currentVersion: doc.currentVersion,
    status: doc.status as DocumentItem["status"],
    issueDate: doc.issueDate,
    expiryDate: doc.expiryDate,
    fileUrl: fileDownloadUrl(doc.primaryFileId),
    fileName: fileNameById.get(doc.primaryFileId),
    categoryName: doc.categoryId ? categoryNameById.get(doc.categoryId) : undefined,
    categoryId: doc.categoryId ?? undefined,
    isCircular: doc.isCircular,
    routes: (routesByDoc.get(doc.id) ?? [])
      .slice()
      .sort((a, b) => a.stepOrder - b.stepOrder)
      .map(toRouteItem),
    history: (historyByDoc.get(doc.id) ?? [])
      .slice()
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map((h) => toHistoryItem(h, diffsByHistory.get(h.id) ?? [], fileNameById.get(h.fileId))),
  }));
}

// Dokumen di Sampah (deleted_at terisi) dianggap TIDAK ADA oleh semua jalur baca/ubah biasa; hanya
// jalur Sampah (loadTrashedDocuments, restore, purge) yang memintanya lewat includeDeleted.
export async function loadDocumentItem(documentId: string, opts: { includeDeleted?: boolean } = {}): Promise<DocumentItem | null> {
  const [doc] = await db
    .select()
    .from(documents)
    .where(opts.includeDeleted ? eq(documents.id, documentId) : and(eq(documents.id, documentId), isNull(documents.deletedAt)))
    .limit(1);
  if (!doc) return null;
  const [item] = await assembleDocumentItems([doc]);
  return item ?? null;
}

// RBAC-scoped list: non-admins only ever see documents at their own location —
// enforced here, server-side, superseding the client-only filter psiStore.tsx used
// to apply on its own (see AuthGuard/psiStore history in CLAUDE.md for why that was
// never sufficient once a real server existed to call directly).
export async function loadDocumentsForUser(user: SessionUser): Promise<DocumentItem[]> {
  const rows = user.isRegionalAdmin
    ? await db.select().from(documents).where(isNull(documents.deletedAt))
    : await db.select().from(documents).where(and(eq(documents.location, user.location ?? ""), isNull(documents.deletedAt)));
  return assembleDocumentItems(rows);
}

export async function loadAllDocuments(): Promise<DocumentItem[]> {
  const rows = await db.select().from(documents).where(isNull(documents.deletedAt));
  return assembleDocumentItems(rows);
}

export async function getDocumentLocation(documentId: string): Promise<string | null> {
  const [doc] = await db
    .select({ location: documents.location })
    .from(documents)
    .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
    .limit(1);
  return doc?.location ?? null;
}

// Daftar Sampah: SEMUA lokasi (lihat-saja untuk user biasa; `canManage` menentukan tombol Pulihkan/Hapus
// permanen — keputusan aksesnya tetap dicek ulang server di route restore/purge).
export async function loadTrashedDocuments(user: SessionUser): Promise<TrashedDocument[]> {
  const rows = await db
    .select({
      id: documents.id,
      documentNumber: documents.documentNumber,
      title: documents.title,
      location: documents.location,
      categoryId: documents.categoryId,
      currentVersion: documents.currentVersion,
      issueDate: documents.issueDate,
      primaryFileId: documents.primaryFileId,
      deletedAt: documents.deletedAt,
      deletedByName: documents.deletedByName,
    })
    .from(documents)
    .where(isNotNull(documents.deletedAt))
    .orderBy(desc(documents.deletedAt));
  if (rows.length === 0) return [];

  const fileIds = Array.from(new Set(rows.map((r) => r.primaryFileId)));
  const catIds = Array.from(new Set(rows.map((r) => r.categoryId).filter((id): id is string => !!id)));
  const [files, cats] = await Promise.all([
    db.select({ id: fileRegistry.id, name: fileRegistry.originalFilename }).from(fileRegistry).where(inArray(fileRegistry.id, fileIds)),
    catIds.length ? db.select({ id: documentCategories.id, name: documentCategories.name }).from(documentCategories).where(inArray(documentCategories.id, catIds)) : Promise.resolve([]),
  ]);
  const fileName = new Map(files.map((f) => [f.id, f.name]));
  const catName = new Map(cats.map((c) => [c.id, c.name]));
  const now = new Date();

  return rows.map((r) => {
    const deletedAt = r.deletedAt as Date;
    return {
      id: r.id,
      documentNumber: r.documentNumber,
      title: r.title,
      location: r.location,
      categoryName: r.categoryId ? catName.get(r.categoryId) : undefined,
      currentVersion: r.currentVersion,
      issueDate: r.issueDate,
      fileUrl: fileDownloadUrl(r.primaryFileId),
      fileName: fileName.get(r.primaryFileId),
      deletedAt: deletedAt.toISOString(),
      deletedByName: r.deletedByName,
      purgeAt: trashPurgeAt(deletedAt).toISOString(),
      daysLeft: trashDaysLeft(deletedAt, now),
      canManage: canDeleteDocument(user, r.location),
    };
  });
}
