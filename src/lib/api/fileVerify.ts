// Pemeriksaan isi berkas yang SUDAH ada di R2 (jalur presigned PUT langsung dari
// browser): ukuran nyata harus sama dengan yang dideklarasikan, lalu isi dipindai
// (lib/security/fileScan.ts). Berkas yang gagal DIHAPUS dari bucket dan barisnya
// ditandai 'failed', jadi tidak pernah bisa diunduh/dilampirkan.
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { fileRegistry } from "@/lib/db/schema";
import { r2, R2_BUCKET } from "@/lib/r2/client";
import { FULL_SCAN_MAX_BYTES, SCAN_EDGE_BYTES, kindOfFilename, scanContent } from "@/lib/security/fileScan";

type FileRow = typeof fileRegistry.$inferSelect;

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
  if (actual <= FULL_SCAN_MAX_BYTES) {
    const buf = await readRange(file.r2ObjectKey);
    problem = scanContent(kind, buf, buf);
  } else {
    const head = await readRange(file.r2ObjectKey, `bytes=0-${SCAN_EDGE_BYTES - 1}`);
    const tail = await readRange(file.r2ObjectKey, `bytes=${actual - SCAN_EDGE_BYTES}-${actual - 1}`);
    problem = scanContent(kind, head, tail);
  }
  return problem ? reject(file, problem) : null;
}
