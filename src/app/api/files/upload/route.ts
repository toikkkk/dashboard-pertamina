// Server-side upload fallback for the browser->R2 direct PUT.
//
// WHY THIS EXISTS (verified 2026-09-17, not speculation): the R2 bucket has no CORS
// policy installed, so the browser's mandatory OPTIONS preflight against a presigned
// PUT URL returns 403 with no Access-Control-Allow-* headers. The browser then blocks
// the PUT and `fetch` rejects with a bare TypeError, which surfaced in the UI as
// "Failed to fetch" on every single "Ajukan Dokumen". Reproduced directly:
//   PUT PREFLIGHT status: 403 / allow-origin: (ABSENT)
//   SERVER-SIDE PUT status: 200  <- same credentials, no CORS involved
// The credentials and bucket are fine; only the browser's cross-origin path is broken.
// The API token in .env.local also lacks permission to install a CORS policy
// (PutBucketCors -> AccessDenied), so this cannot be fixed from code alone.
//
// This route sends the bytes through the Next.js server instead, where CORS does not
// apply, and performs the PutObject with the same credentials that already work.
// uploadFile.ts still ATTEMPTS the direct presigned PUT first and only falls back
// here — so once a CORS policy is added in the Cloudflare dashboard (see
// docs/R2-CORS-SETUP.md), large uploads automatically resume bypassing the server
// without any code change.
//
// Caveat kept deliberately visible: bytes pass through the serverless function here,
// so this path is subject to the platform's request-body ceiling (~4.5MB on Vercel).
// That is exactly why the direct-PUT path remains primary rather than being deleted.
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/lib/db/client";
import { fileRegistry } from "@/lib/db/schema";
import { r2, R2_BUCKET } from "@/lib/r2/client";
import { sanitizeFilename } from "@/lib/r2/keys";
import { requireSessionUser } from "@/lib/auth/session";
import { assertOnboarded } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";

// Same allowlist as presign-upload — a second entry point into the bucket must not
// become a weaker one. Kept in sync deliberately; both reject anything that could be
// served back inline as script (.html/.svg).
const ALLOWED_UPLOAD_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel.sheet.macroEnabled.12": [".xlsm"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
};

const MAX_PROXY_BYTES = 500 * 1024 * 1024;

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertOnboarded(user);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Berkas tidak ditemukan dalam permintaan." }, { status: 400 });
    }

    const filename = file.name;
    const mimeType = file.type || "application/octet-stream";
    const sizeBytes = file.size;

    if (sizeBytes <= 0 || sizeBytes > MAX_PROXY_BYTES) {
      return NextResponse.json({ error: "Ukuran berkas tidak valid." }, { status: 400 });
    }

    const allowedExts = ALLOWED_UPLOAD_TYPES[mimeType];
    const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
    if (!allowedExts || !allowedExts.includes(ext)) {
      return NextResponse.json(
        { error: "Jenis berkas tidak diizinkan. Gunakan PDF, Word, Excel, atau gambar (JPG/PNG)." },
        { status: 400 }
      );
    }

    const id = randomUUID();
    const key = `documents/app-uploads/${id}/${sanitizeFilename(filename)}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    // Upload to R2 BEFORE inserting the row: a failed PutObject must not leave an
    // orphan 'pending' registry row behind (the direct-PUT flow can strand those,
    // which is why 4 already exist in file_registry).
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: bytes,
        ContentType: mimeType,
      })
    );

    await db.insert(fileRegistry).values({
      id,
      r2ObjectKey: key,
      originalRelativePath: key,
      originalFilename: filename,
      category: "app-upload",
      pathSegments: [],
      sizeBytes,
      mimeType,
      // Already in the bucket by this point — no separate confirm step needed, so
      // this row is never left dangling in 'pending'.
      uploadStatus: "uploaded",
      uploadedAt: new Date(),
      uploadedByUserId: user.id,
    });

    return NextResponse.json({ fileId: id, uploadStatus: "uploaded", via: "server-proxy" });
  });
}
