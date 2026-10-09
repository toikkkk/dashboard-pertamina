// Penghapusan PERMANEN dokumen yang sudah ada di Sampah. Dipakai tombol "Hapus permanen" dan cron 30 hari.
// Riwayat/rute ikut terhapus (cascade); berkas di penyimpanan dihapus HANYA bila tidak dipakai dokumen/
// riwayat/bukti MOC lain. Tak terbalik — satu-satunya jalan kembali adalah cadangan.
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents, historyItems, fileRegistry, mocEvidence } from "@/lib/db/schema";
import { r2, R2_BUCKET } from "@/lib/r2/client";
import { HttpError } from "@/lib/api/respond";

export async function purgeDocumentRow(docRow: typeof documents.$inferSelect): Promise<{ filesRemoved: number; filesTotal: number }> {
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
