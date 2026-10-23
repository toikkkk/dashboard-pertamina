// PSI terdampak per MOC (Tahap 4). Tautan ke dokumen Direktori; "sudah diperbarui" dihitung dari riwayat dokumen
// (entri Revised yang BUKAN koreksi/tinjauan/penggantian) setelah dokumen ditandai, tanpa kolom status tersendiri.
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents, historyItems, mocAffectedDocs, mocRequests, users } from "@/lib/db/schema";
import type { MocAffectedDoc, MocAffectedByDoc } from "@/lib/domain/moc";

const NON_UPDATE_PREFIXES = ["Dikoreksi:", "Ditinjau:", "Digantikan:", "Aktif kembali:"];
const isRealRevision = (action: string, notes: string | null) =>
  action === "Revised" && !NON_UPDATE_PREFIXES.some((p) => (notes ?? "").startsWith(p));

// Kapan tiap dokumen terakhir benar-benar direvisi (null = belum pernah), per id dokumen.
async function lastRevisionAt(documentIds: string[]): Promise<Map<string, Date>> {
  const out = new Map<string, Date>();
  if (documentIds.length === 0) return out;
  const rows = await db
    .select({ documentId: historyItems.documentId, action: historyItems.action, notes: historyItems.notes, timestamp: historyItems.timestamp })
    .from(historyItems)
    .where(and(inArray(historyItems.documentId, documentIds), eq(historyItems.action, "Revised")))
    .orderBy(asc(historyItems.timestamp));
  for (const r of rows) if (isRealRevision(r.action, r.notes)) out.set(r.documentId, r.timestamp);
  return out;
}

export async function loadAffectedDocs(mocId: string): Promise<MocAffectedDoc[]> {
  const rows = await db
    .select({
      a: mocAffectedDocs,
      number: documents.documentNumber,
      title: documents.title,
      version: documents.currentVersion,
      addedByName: users.name,
    })
    .from(mocAffectedDocs)
    .innerJoin(documents, eq(documents.id, mocAffectedDocs.documentId))
    .leftJoin(users, eq(users.id, mocAffectedDocs.addedBy))
    .where(and(eq(mocAffectedDocs.mocId, mocId), isNull(documents.deletedAt)))
    .orderBy(asc(mocAffectedDocs.addedAt));
  const last = await lastRevisionAt(rows.map((r) => r.a.documentId));
  return rows.map((r) => ({
    documentId: r.a.documentId,
    documentNumber: r.number,
    title: r.title,
    baselineVersion: r.a.baselineVersion,
    currentVersion: r.version,
    addedByName: r.addedByName ?? "—",
    addedAt: r.a.addedAt.toISOString(),
    updated: (last.get(r.a.documentId)?.getTime() ?? 0) > r.a.addedAt.getTime(),
  }));
}

// MOC yang menandai dokumen ini sebagai terdampak (untuk kartu "Terkait MOC" di halaman dokumen).
export async function loadMocsAffectingDoc(documentId: string): Promise<MocAffectedByDoc[]> {
  const rows = await db
    .select({ a: mocAffectedDocs, mocNumber: mocRequests.mocNumber, judul: mocRequests.judul, registerStatus: mocRequests.registerStatus, validationState: mocRequests.validationState })
    .from(mocAffectedDocs)
    .innerJoin(mocRequests, and(eq(mocRequests.id, mocAffectedDocs.mocId), isNull(mocRequests.deletedAt)))
    .where(eq(mocAffectedDocs.documentId, documentId))
    .orderBy(asc(mocAffectedDocs.addedAt));
  const last = (await lastRevisionAt([documentId])).get(documentId)?.getTime() ?? 0;
  return rows.map((r) => ({
    mocId: r.a.mocId,
    mocNumber: r.mocNumber,
    judul: r.judul,
    registerStatus: r.registerStatus,
    validationState: r.validationState,
    baselineVersion: r.a.baselineVersion,
    addedAt: r.a.addedAt.toISOString(),
    updated: last > r.a.addedAt.getTime(),
  }));
}
