// Step 2 of the upload flow: the browser calls this once its direct PUT to R2 (from
// the presigned URL) succeeds, flipping the file_registry row from 'pending' to
// 'uploaded'. Only the uploader may confirm their own pending row.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { fileRegistry } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { ForbiddenError } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";
import { verifyUploadedObject } from "@/lib/api/fileVerify";
import { canUploadEncryptedPdf } from "@/lib/security/fileScan";

export async function POST(req: NextRequest, { params }: { params: { fileId: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    await req.json().catch(() => ({})); // body kosong dari uploadFile.ts, tidak dipakai

    const [file] = await db.select().from(fileRegistry).where(eq(fileRegistry.id, params.fileId)).limit(1);
    if (!file) return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 404 });
    if (file.uploadedByUserId !== user.id) {
      throw new ForbiddenError("Anda tidak dapat mengonfirmasi unggahan milik user lain.");
    }

    if (file.uploadStatus === "failed") {
      return NextResponse.json({ error: "Berkas ini sebelumnya ditolak pemeriksaan keamanan. Unggah ulang berkas yang berbeda." }, { status: 400 });
    }
    if (file.uploadStatus === "pending") {
      // Periksa isi nyata di bucket (ukuran + tanda-byte + pola berbahaya + duplikat
      // isi dengan berkas lain yang sudah ada — lihat fileVerify.ts) sebelum dianggap
      // sah. Sudah menulis checksum_sha256 sendiri kalau lolos, jangan ditimpa di sini.
      // allowDuplicate hanya dihormati untuk akun tepercaya (Controller / Admin Regional), mis. melampirkan dokumen MOC
      // offline yang salinannya sudah ada di arsip.
      const reqBody = await req.json().catch(() => ({}));
      const trusted = canUploadEncryptedPdf(user);
      const problem = await verifyUploadedObject(file, { allowEncryptedPdf: trusted, allowDuplicate: trusted && reqBody?.allowDuplicate === true });
      if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    }

    const [updated] = await db
      .update(fileRegistry)
      .set({ uploadStatus: "uploaded", uploadedAt: new Date() })
      .where(eq(fileRegistry.id, params.fileId))
      .returning();

    return NextResponse.json({ id: updated.id, uploadStatus: updated.uploadStatus });
  });
}
