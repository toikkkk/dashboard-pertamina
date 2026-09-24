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

// "inline" (not "attachment") — DocumentContentPreview.tsx's PDF <iframe> and the
// client-side spreadsheet parser both hit this same URL expecting it to render/be
// fetchable, not force a save dialog. `inline` still gets the real filename applied
// if the browser DOES end up saving it (right-click Save As, or a non-renderable
// type like .xlsx that the browser can't display inline anyway) — only the R2
// object key's hash-prefixed name was ever the problem, not the disposition type.
function contentDispositionHeader(filename: string): string {
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");
  return `inline; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(_req: Request, { params }: { params: { fileId: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();

    const [file] = await db.select().from(fileRegistry).where(eq(fileRegistry.id, params.fileId)).limit(1);
    if (!file || file.uploadStatus !== "uploaded") {
      return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 404 });
    }

    const [asPrimary] = await db.select({ location: documents.location }).from(documents).where(eq(documents.primaryFileId, file.id)).limit(1);
    const [asHistory] = await db
      .select({ location: documents.location })
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

    const url = await getSignedUrl(
      r2,
      new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: file.r2ObjectKey,
        ResponseContentDisposition: contentDispositionHeader(file.originalFilename),
      }),
      { expiresIn: 300 }
    );

    return NextResponse.redirect(url, { status: 302 });
  });
}
