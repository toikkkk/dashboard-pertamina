// Aksi Sampah dokumen yang dipakai bersama route tunggal, route massal (trash/bulk), dan cron: pindah ke
// Sampah, pulihkan, hapus permanen. Setiap fungsi memeriksa hak (Admin Regional, atau user yang punya hak tulis di lokasi dokumen)
// sendiri, jadi pemanggil tidak bisa lupa. Hapus permanen: baris dokumen + berkas di R2/registry yang tak dipakai
// data lain ikut hilang; tak terbalik (kecuali dari cadangan).
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents, historyItems, historyDiffs, fileRegistry, mocEvidence } from "@/lib/db/schema";
import { r2, R2_BUCKET } from "@/lib/r2/client";
import { HttpError } from "@/lib/api/respond";
import { ForbiddenError } from "@/lib/auth/rbac";
import type { SessionUser } from "@/lib/auth/session";
import { canDeleteDocument } from "@/lib/domain/rules";
import { TRASH_URGENT_DAYS, trashDaysLeft, trashPurgeAt } from "@/lib/domain/trash";
import { logAudit } from "@/lib/audit";

type DocRow = typeof documents.$inferSelect;
const actorOf = (u: SessionUser) => ({ id: u.id, name: u.name, email: u.email });
const label = (d: DocRow) => `${d.documentNumber} ${d.title}`;

export async function purgeDocumentRow(docRow: DocRow): Promise<{ filesRemoved: number; filesTotal: number }> {
  const hist = await db.select({ fileId: historyItems.fileId }).from(historyItems).where(eq(historyItems.documentId, docRow.id));
  const fileIds = Array.from(new Set([docRow.primaryFileId, ...hist.map((h) => h.fileId)]));

  try {
    await db.delete(documents).where(eq(documents.id, docRow.id));
  } catch (err) {
    const code = (err as { code?: string; cause?: { code?: string } })?.code ?? (err as { cause?: { code?: string } })?.cause?.code;
    if (code === "23503") throw new HttpError(409, "Dokumen ini masih direferensikan data lain dan tidak dapat dihapus permanen.");
    throw err;
  }

  // Berkas yang sudah tidak dipakai siapa pun → hapus dari R2 lalu dari registry.
  let filesRemoved = 0;
  for (const fid of fileIds) {
    const [a] = await db.select({ id: documents.id }).from(documents).where(eq(documents.primaryFileId, fid)).limit(1);
    const [b] = await db.select({ id: historyItems.id }).from(historyItems).where(eq(historyItems.fileId, fid)).limit(1);
    const [c] = await db.select({ id: mocEvidence.id }).from(mocEvidence).where(eq(mocEvidence.fileId, fid)).limit(1);
    if (a || b || c) continue;
    const [f] = await db.select({ key: fileRegistry.r2ObjectKey }).from(fileRegistry).where(eq(fileRegistry.id, fid)).limit(1);
    if (!f) continue;
    try {
      const res = await r2.send(new DeleteObjectsCommand({ Bucket: R2_BUCKET, Delete: { Objects: [{ Key: f.key }], Quiet: true } }));
      if ((res.Errors ?? []).length === 0) {
        await db.delete(fileRegistry).where(eq(fileRegistry.id, fid));
        filesRemoved += 1;
      }
    } catch (err) {
      console.error("[hapus-permanen] gagal menghapus berkas", fid, err instanceof Error ? err.message : err);
    }
  }
  return { filesRemoved, filesTotal: fileIds.length };
}

/** Dokumen aktif → Sampah. Mengembalikan waktu hapus permanen otomatis. */
export async function moveToTrash(req: Request, user: SessionUser, docRow: DocRow): Promise<Date> {
  if (docRow.deletedAt) throw new HttpError(404, "Dokumen tidak ditemukan.");
  if (!canDeleteDocument(user, docRow.location)) {
    throw new ForbiddenError("Anda hanya dapat memindahkan ke Sampah dokumen di terminal Anda sendiri.");
  }
  const now = new Date();
  await db
    .update(documents)
    .set({ deletedAt: now, deletedById: user.id, deletedByName: user.name, updatedAt: now })
    .where(and(eq(documents.id, docRow.id), isNull(documents.deletedAt)));
  const purgeAt = trashPurgeAt(now);
  await logAudit(req, actorOf(user), "dokumen.dihapus", {
    targetType: "dokumen",
    targetId: docRow.id,
    targetLabel: label(docRow),
    location: docRow.location,
    detail: { keSampah: true, versi: docRow.currentVersion, terbit: docRow.issueDate, berlaku: docRow.expiryDate, hapusPermanenOtomatis: purgeAt.toISOString().slice(0, 10) },
  });
  return purgeAt;
}

/** Sampah → aktif lagi. Riwayat bernada "Dikoreksi:" supaya tidak dihitung pembaruan nyata di dashboard. */
export async function restoreFromTrash(req: Request, user: SessionUser, docRow: DocRow): Promise<void> {
  if (!docRow.deletedAt) throw new HttpError(404, "Dokumen tidak ada di Sampah.");
  if (!canDeleteDocument(user, docRow.location)) {
    throw new ForbiddenError("Anda hanya dapat memulihkan dokumen di terminal Anda sendiri.");
  }
  await db
    .update(documents)
    .set({ deletedAt: null, deletedById: null, deletedByName: null, updatedAt: new Date() })
    .where(and(eq(documents.id, docRow.id), isNotNull(documents.deletedAt)));
  const [history] = await db
    .insert(historyItems)
    .values({
      documentId: docRow.id,
      actorName: user.name,
      actorRole: user.role,
      location: docRow.location,
      action: "Revised",
      notes: "Dikoreksi: dokumen dipulihkan dari Sampah",
      fileId: docRow.primaryFileId,
      version: docRow.currentVersion,
    })
    .returning({ id: historyItems.id });
  await db.insert(historyDiffs).values({ historyItemId: history.id, field: "Keberadaan", oldValue: "Di Sampah", newValue: "Aktif" });
  await logAudit(req, actorOf(user), "dokumen.dipulihkan", { targetType: "dokumen", targetId: docRow.id, targetLabel: label(docRow), location: docRow.location });
}

/** Hapus permanen sekarang — hanya untuk dokumen yang SUDAH di Sampah. */
export async function purgeFromTrash(req: Request, user: SessionUser, docRow: DocRow): Promise<{ filesRemoved: number }> {
  if (!docRow.deletedAt) throw new HttpError(404, "Dokumen tidak ada di Sampah.");
  if (!canDeleteDocument(user, docRow.location)) {
    throw new ForbiddenError("Anda hanya dapat menghapus permanen dokumen di terminal Anda sendiri.");
  }
  const { filesRemoved, filesTotal } = await purgeDocumentRow(docRow);
  await logAudit(req, actorOf(user), "dokumen.dihapus_permanen", {
    targetType: "dokumen",
    targetId: docRow.id,
    targetLabel: label(docRow),
    location: docRow.location,
    detail: { versi: docRow.currentVersion, berkasDihapus: filesRemoved, berkasTotal: filesTotal, dihapusDariSampah: docRow.deletedAt.toISOString() },
  });
  return { filesRemoved };
}

/** Ringkasan untuk lencana sidebar: hanya dokumen di Sampah yang BOLEH dikelola user ini. */
export async function trashSummaryForUser(user: SessionUser): Promise<{ total: number; urgent: number }> {
  const rows = await db.select({ location: documents.location, deletedAt: documents.deletedAt }).from(documents).where(isNotNull(documents.deletedAt));
  const mine = rows.filter((r) => canDeleteDocument(user, r.location));
  const now = new Date();
  return { total: mine.length, urgent: mine.filter((r) => trashDaysLeft(r.deletedAt as Date, now) <= TRASH_URGENT_DAYS).length };
}
