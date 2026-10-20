// Menyatukan potongan (route chunk) menjadi satu objek di R2 pada kunci akhir berkas, lalu menghapus potongan sementara.
// Sesudah ini klien memanggil /confirm seperti biasa (pemeriksaan ukuran, isi, dan duplikat tetap dijalankan di sana).
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { fileRegistry } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertOnboarded, ForbiddenError } from "@/lib/auth/rbac";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { r2, R2_BUCKET } from "@/lib/r2/client";
import { chunkKey } from "@/lib/r2/chunks";

export const maxDuration = 60;
// Batas wajar perakitan di fungsi server (berkas lebih besar dari ini sebaiknya lewat unggahan langsung).
const MAX_ASSEMBLE_BYTES = 150 * 1024 * 1024;

const bodySchema = z.object({ chunks: z.number().int().min(1).max(100000) });

export async function POST(req: NextRequest, { params }: { params: { fileId: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertOnboarded(user);
    const { chunks } = bodySchema.parse(await req.json());
    const [file] = await db.select().from(fileRegistry).where(eq(fileRegistry.id, params.fileId)).limit(1);
    if (!file) throw new HttpError(404, "Berkas tidak ditemukan.");
    if (file.uploadedByUserId !== user.id) throw new ForbiddenError("Anda tidak dapat merakit berkas milik user lain.");
    if (file.uploadStatus !== "pending") throw new HttpError(409, "Berkas ini sudah tidak dapat dirakit.");
    if (Number(file.sizeBytes) > MAX_ASSEMBLE_BYTES) throw new HttpError(413, "Berkas terlalu besar untuk jalur ini.");

    // Semua potongan harus ada dan jumlah ukurannya persis sama dengan yang dideklarasikan.
    let total = 0;
    for (let i = 0; i < chunks; i++) {
      try {
        const head = await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: chunkKey(file.id, i) }));
        total += head.ContentLength ?? 0;
      } catch {
        throw new HttpError(400, `Potongan ke-${i + 1} belum diterima. Ulangi unggahan.`);
      }
    }
    if (total !== Number(file.sizeBytes)) throw new HttpError(400, "Ukuran gabungan potongan tidak sesuai dengan berkas yang dideklarasikan.");

    async function* body() {
      for (let i = 0; i < chunks; i++) {
        const res = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: chunkKey(file.id, i) }));
        yield Buffer.from((await res.Body?.transformToByteArray()) ?? []);
      }
    }
    await new Upload({
      client: r2,
      params: { Bucket: R2_BUCKET, Key: file.r2ObjectKey, Body: Readable.from(body()), ContentType: file.mimeType },
      queueSize: 2,
      partSize: 8 * 1024 * 1024,
    }).done();

    for (let i = 0; i < chunks; i++) {
      await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: chunkKey(file.id, i) })).catch(() => undefined);
    }
    return NextResponse.json({ ok: true, size: total });
  });
}
