// Backs reviseDocument(docId, newVersion, newFileId, notes?) — "5-Year Dilemma"
// option 1: facility changed, new file required, version bumped, expiry recomputed
// from TODAY (not the old expiry — different base than extendValidity, matches the
// client-only prototype). Critical invariant carried over from psiStore.tsx: if the
// document is circular, every route MUST reset to "Pending" — this was a real bug
// once (status flipped to "In Routing" but stale "Approved" routes meant nobody
// could ever act on it again). Don't drop the reset if this file is touched.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { historyItems, historyDiffs, documents, approvalRoutes, fileRegistry } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertLocationWrite } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";
import { loadDocumentItem } from "@/lib/api/documents";

const bodySchema = z.object({
  newVersion: z.string().trim().min(1),
  newFileId: z.string().uuid(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const { newVersion, newFileId, notes } = bodySchema.parse(await req.json());

    const [docRow] = await db.select().from(documents).where(eq(documents.id, params.id)).limit(1);
    if (!docRow) return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
    assertLocationWrite(user, docRow.location);

    const [newFile] = await db.select().from(fileRegistry).where(eq(fileRegistry.id, newFileId)).limit(1);
    if (!newFile || newFile.uploadStatus !== "uploaded") {
      return NextResponse.json({ error: "Berkas baru belum selesai diunggah atau tidak ditemukan." }, { status: 404 });
    }

    const newExpiryYear = new Date().getFullYear() + 5;
    const newExpiryDate = `${newExpiryYear}-12-31`;
    const newStatus = docRow.isCircular ? "In Routing" : "Approved";

    await db
      .update(documents)
      .set({
        currentVersion: newVersion,
        primaryFileId: newFileId,
        status: newStatus,
        expiryDate: newExpiryDate,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, params.id));

    if (docRow.isCircular) {
      await db
        .update(approvalRoutes)
        .set({ status: "Pending", actionDate: null, comment: null })
        .where(eq(approvalRoutes.documentId, params.id));
    }

    const [history] = await db
      .insert(historyItems)
      .values({
        documentId: params.id,
        actorName: user.name,
        actorRole: user.role,
        location: docRow.location,
        action: "Revised",
        notes: notes || `Revisi dokumen ke versi ${newVersion}`,
        fileId: newFileId,
        version: newVersion,
      })
      .returning();

    const [oldFile] = await db.select().from(fileRegistry).where(eq(fileRegistry.id, docRow.primaryFileId)).limit(1);

    const diffRows = [
      { historyItemId: history.id, field: "Versi Dokumen", oldValue: docRow.currentVersion, newValue: newVersion },
      {
        historyItemId: history.id,
        field: "Nama Berkas",
        oldValue: oldFile?.originalFilename ?? docRow.primaryFileId,
        newValue: newFile.originalFilename,
      },
      { historyItemId: history.id, field: "Tanggal Kedaluwarsa", oldValue: docRow.expiryDate, newValue: newExpiryDate },
      { historyItemId: history.id, field: "Status Dokumen", oldValue: docRow.status, newValue: newStatus },
    ];
    if (docRow.isCircular) {
      diffRows.push({
        historyItemId: history.id,
        field: "Sirkuler",
        oldValue: "Selesai (putaran lama)",
        newValue: "Tahap 1 (putaran baru)",
      });
    }
    await db.insert(historyDiffs).values(diffRows);

    const updated = await loadDocumentItem(params.id);
    return NextResponse.json(updated);
  });
}
