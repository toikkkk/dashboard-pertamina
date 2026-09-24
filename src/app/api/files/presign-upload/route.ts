// Step 1 of the upload flow: creates a `pending` file_registry row and returns a
// presigned PUT URL the BROWSER uploads directly to R2 — never proxied through this
// Vercel function, since several real files in this app's domain (dwg drawings,
// scanned PDFs) exceed Vercel's ~4.5MB serverless request-body ceiling. Step 2 is
// POST /api/files/[fileId]/confirm once the browser's PUT finishes.
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db } from "@/lib/db/client";
import { fileRegistry } from "@/lib/db/schema";
import { r2, R2_BUCKET } from "@/lib/r2/client";
import { sanitizeFilename } from "@/lib/r2/keys";
import { requireSessionUser } from "@/lib/auth/session";
import { assertOnboarded } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";
import { validateUploadMeta } from "@/lib/security/fileScan";

const bodySchema = z.object({
  filename: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(255),
  sizeBytes: z.number().int().positive().max(500 * 1024 * 1024), // 500MB ceiling
});

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertOnboarded(user);
    const { filename, mimeType, sizeBytes } = bodySchema.parse(await req.json());

    // Daftar putih jenis berkas + nama aman; isi berkas diperiksa lagi saat konfirmasi.
    const meta = validateUploadMeta(filename, mimeType);
    if (!meta.ok) return NextResponse.json({ error: meta.error }, { status: 400 });

    const id = randomUUID();
    const key = `documents/app-uploads/${id}/${sanitizeFilename(filename)}`;

    await db.insert(fileRegistry).values({
      id,
      r2ObjectKey: key,
      // App uploads have no source filesystem path — the R2 key doubles as a
      // stand-in here, still globally unique since `id` is fresh every call.
      originalRelativePath: key,
      originalFilename: filename,
      category: "app-upload",
      pathSegments: [],
      sizeBytes,
      mimeType: meta.kind.mime,
      uploadStatus: "pending",
      uploadedByUserId: user.id,
    });

    const uploadUrl = await getSignedUrl(
      r2,
      new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: meta.kind.mime }),
      { expiresIn: 300 }
    );

    return NextResponse.json({ fileId: id, uploadUrl });
  });
}
