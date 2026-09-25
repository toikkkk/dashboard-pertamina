// Every fileUrl the frontend ever sees points here (see lib/api/documents.ts's
// fileDownloadUrl) — this is the sole read path into the private R2 bucket. RBAC:
// if the file is linked to a curated document (as its current primary file or a
// historical version snapshot), the requester needs access to that document's
// location; an unlinked raw registry file is admin-only. 302s to a 5-minute
// presigned GET URL rather than proxying bytes through this function.
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db } from "@/lib/db/client";
import { fileRegistry, documents, historyItems, mocEvidence, mocRequests } from "@/lib/db/schema";
import { r2, R2_BUCKET } from "@/lib/r2/client";
import { requireSessionUser } from "@/lib/auth/session";
import { assertLocationRead, assertRegionalAdmin } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";
import { extOf, kindOfFilename } from "@/lib/security/fileScan";

// Hanya PDF dan gambar (jenis yang sudah diperiksa dan aman ditampilkan) yang disajikan
// "inline" untuk pratinjau; SEMUA jenis lain dipaksa diunduh sebagai attachment agar
// tidak pernah dijalankan/dirender browser. Nama berkas asli tetap dipakai.
function contentDispositionHeader(filename: string, inline: boolean): string {
  const asciiFallback = filename.replace(/[^ -~]/g, "_").replace(/"/g, "'");
  return `${inline ? "inline" : "attachment"}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

// Nama berkas hasil unduhan = judul dokumen yang tampil di aplikasi (+ " v<versi>" untuk
// versi lama di riwayat) + ekstensi asli. Sebelumnya memakai nama berkas unggahan asli,
// yang sering sama sekali berbeda dari judul di layar. Berkas tanpa dokumen (arsip
// registry, bukti MOC) tetap memakai nama aslinya.
function downloadName(
  original: string,
  primaryTitle: string | undefined,
  history: { title: string; version: string; current: string } | undefined
): string {
  const title = primaryTitle ?? history?.title;
  if (!title) return original;
  const dot = original.lastIndexOf(".");
  const ext = dot > -1 ? original.slice(dot) : "";
  const clean = title.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  if (!clean) return original;
  const older = !primaryTitle && history && history.version !== history.current;
  return `${clean}${older ? ` v${history!.version}` : ""}${ext}`;
}

export async function GET(_req: Request, { params }: { params: { fileId: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();

    const [file] = await db.select().from(fileRegistry).where(eq(fileRegistry.id, params.fileId)).limit(1);
    if (!file || file.uploadStatus !== "uploaded") {
      return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 404 });
    }

    const [asPrimary] = await db.select({ location: documents.location, title: documents.title }).from(documents).where(eq(documents.primaryFileId, file.id)).limit(1);
    const [asHistory] = await db
      .select({ location: documents.location, title: documents.title, version: historyItems.version, current: documents.currentVersion })
      .from(historyItems)
      .innerJoin(documents, eq(historyItems.documentId, documents.id))
      .where(eq(historyItems.fileId, file.id))
      .limit(1);

    // Berkas bukti tanda tangan MOC juga "milik" lokasi MOC-nya, bukan arsip mentah.
    const [asMocEvidence] = await db
      .select({ location: mocRequests.location })
      .from(mocEvidence)
      .innerJoin(mocRequests, eq(mocEvidence.mocId, mocRequests.id))
      .where(eq(mocEvidence.fileId, file.id))
      .limit(1);

    const linkedLocation = asPrimary?.location ?? asHistory?.location ?? asMocEvidence?.location ?? null;
    if (linkedLocation) {
      assertLocationRead(user);
    } else {
      // Not part of any curated document — a raw archive file, admin-only until
      // deliberately linked via POST /api/registry/[id]/link.
      assertRegionalAdmin(user);
    }

    // Tipe konten ditetapkan SERVER dari ekstensi berkas — bukan klaim klien saat unggah.
    // Ekstensi di luar daftar putih (arsip lama hasil migrasi) => octet-stream + attachment.
    const kind = kindOfFilename(file.originalFilename);
    const known = !!kind || extOf(file.originalFilename) === ".xlsm" || extOf(file.originalFilename) === ".xls" || extOf(file.originalFilename) === ".doc";
    const inline = !!kind?.inline;
    const url = await getSignedUrl(
      r2,
      new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: file.r2ObjectKey,
        ResponseContentDisposition: contentDispositionHeader(downloadName(file.originalFilename, asPrimary?.title, asHistory), inline),
        ResponseContentType: kind?.mime ?? (known ? file.mimeType : "application/octet-stream"),
      }),
      { expiresIn: 300 }
    );

    return NextResponse.redirect(url, { status: 302 });
  });
}
