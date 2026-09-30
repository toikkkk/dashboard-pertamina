// Pemeriksaan isi berkas yang SUDAH ada di R2 (jalur presigned PUT langsung dari
// browser): ukuran nyata harus sama dengan yang dideklarasikan, lalu isi dipindai
// (lib/security/fileScan.ts). Berkas yang gagal DIHAPUS dari bucket dan barisnya
// ditandai 'failed', jadi tidak pernah bisa diunduh/dilampirkan.
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { createHash } from "crypto";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { fileRegistry } from "@/lib/db/schema";
import { r2, R2_BUCKET } from "@/lib/r2/client";
import { FULL_SCAN_MAX_BYTES, SCAN_EDGE_BYTES, kindOfFilename, scanContent } from "@/lib/security/fileScan";

type FileRow = typeof fileRegistry.$inferSelect;

// Isi berkas (bukan nama) yang menentukan duplikat — dipakai kedua jalur unggah
// (langsung ke R2 dan proxy server) supaya berkas yang sudah ada di arsip (migrasi
// ATAU unggahan sebelumnya) tidak pernah tersalin ulang tanpa disadari pengunggah.
export async function findDuplicateFile(checksumSha256: string, excludeId?: string) {
  const [dup] = await db
    .select({ id: fileRegistry.id, originalFilename: fileRegistry.originalFilename, category: fileRegistry.category })
    .from(fileRegistry)
    .where(
      and(
        eq(fileRegistry.checksumSha256, checksumSha256),
        eq(fileRegistry.uploadStatus, "uploaded"),
        excludeId ? ne(fileRegistry.id, excludeId) : undefined
      )
    )
    .limit(1);
  return dup ?? null;
}

export function duplicateMessage(dup: { originalFilename: string }): string {
  return `Berkas ini isinya sama persis dengan berkas yang sudah ada di arsip ("${dup.originalFilename}"). Gunakan Arsip Registry untuk menautkan berkas yang sudah ada, bukan mengunggah salinan baru.`;
}

async function readRange(key: string, range?: string): Promise<Buffer> {
  const res = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key, Range: range }));
  const bytes = await res.Body?.transformToByteArray();
  return Buffer.from(bytes ?? []);
}

async function reject(file: FileRow, message: string): Promise<string> {
  await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: file.r2ObjectKey })).catch(() => undefined);
  await db.update(fileRegistry).set({ uploadStatus: "failed" }).where(eq(fileRegistry.id, file.id));
  return message;
}

// Mengembalikan null bila berkas aman, atau pesan galat (berkas sudah dihapus).
export async function verifyUploadedObject(file: FileRow): Promise<string | null> {
  const kind = kindOfFilename(file.originalFilename);
  if (!kind) return reject(file, "Jenis berkas tidak diizinkan.");

  let actual: number;
  try {
    const head = await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: file.r2ObjectKey }));
    actual = head.ContentLength ?? 0;
  } catch {
    return "Berkas belum diterima penyimpanan. Coba unggah ulang.";
  }
  if (actual <= 0 || actual !== Number(file.sizeBytes)) {
    return reject(file, "Ukuran berkas tidak sesuai dengan yang dideklarasikan.");
  }

  let problem: string | null;
  let fullBuf: Buffer | null = null;
  if (actual <= FULL_SCAN_MAX_BYTES) {
    fullBuf = await readRange(file.r2ObjectKey);
    problem = scanContent(kind, fullBuf, fullBuf);
  } else {
    const head = await readRange(file.r2ObjectKey, `bytes=0-${SCAN_EDGE_BYTES - 1}`);
    const tail = await readRange(file.r2ObjectKey, `bytes=${actual - SCAN_EDGE_BYTES}-${actual - 1}`);
    problem = scanContent(kind, head, tail);
  }
  if (problem) return reject(file, problem);

  // Deteksi duplikat isi berkas. Hanya untuk berkas yang seluruh isinya sudah dibaca
  // di atas (fullBuf) — berkas besar (hanya kepala/ekor dipindai) dilewati agar tidak
  // perlu baca ulang seluruh isi cuma untuk hash.
  if (fullBuf) {
    const checksumSha256 = createHash("sha256").update(fullBuf).digest("hex");
    const dup = await findDuplicateFile(checksumSha256, file.id);
    if (dup) return reject(file, duplicateMessage(dup));
    await db.update(fileRegistry).set({ checksumSha256 }).where(eq(fileRegistry.id, file.id));
  }
  return null;
}
