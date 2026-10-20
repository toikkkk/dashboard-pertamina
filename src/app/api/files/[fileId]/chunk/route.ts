// Jalur unggah berpotongan (chunked) lewat server sendiri: dipakai klien bila unggahan langsung ke R2 terblokir di
// jaringan/peramban pengguna. Tiap potongan <= ~4MB (di bawah batas ~4,5MB platform) disimpan sementara di
// tmp-chunks/<fileId>/<nomor>; route assemble lalu menyatukannya menjadi satu objek. Hanya pemilik unggahan yang berstatus
// pending yang boleh mengirim potongan.
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { fileRegistry } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertOnboarded, ForbiddenError } from "@/lib/auth/rbac";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { r2, R2_BUCKET } from "@/lib/r2/client";
import { CHUNK_MAX_BYTES, chunkKey } from "@/lib/r2/chunks";

export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: { fileId: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertOnboarded(user);
    const i = Number(req.nextUrl.searchParams.get("i"));
    if (!Number.isInteger(i) || i < 0 || i > 100000) throw new HttpError(400, "Nomor potongan tidak valid.");
    const [file] = await db.select().from(fileRegistry).where(eq(fileRegistry.id, params.fileId)).limit(1);
    if (!file) throw new HttpError(404, "Berkas tidak ditemukan.");
    if (file.uploadedByUserId !== user.id) throw new ForbiddenError("Anda tidak dapat mengunggah ke berkas milik user lain.");
    if (file.uploadStatus !== "pending") throw new HttpError(409, "Berkas ini sudah tidak menerima potongan.");

    const bytes = Buffer.from(await req.arrayBuffer());
    if (bytes.length === 0 || bytes.length > CHUNK_MAX_BYTES) throw new HttpError(400, "Ukuran potongan tidak valid.");
    await r2.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: chunkKey(file.id, i), Body: bytes, ContentType: "application/octet-stream" }));
    return NextResponse.json({ ok: true, i, size: bytes.length });
  });
}
