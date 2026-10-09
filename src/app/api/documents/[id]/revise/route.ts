// Backs reviseDocument(docId, newVersion, newFileId, notes?) — "5-Year Dilemma"
// option 1: facility changed, new file required, version bumped, expiry recomputed
// from TODAY (not the old expiry — different base than extendValidity, matches the
// client-only prototype). Critical invariant carried over from psiStore.tsx: if the
// document is circular, every route MUST reset to "Pending" — this was a real bug
// once (status flipped to "In Routing" but stale "Approved" routes meant nobody
// could ever act on it again). Don't drop the reset if this file is touched.
import { logAudit } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { historyItems, historyDiffs, documents, approvalRoutes, fileRegistry, documentCategories } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertLocationWrite } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";
import { loadDocumentItem } from "@/lib/api/documents";

const bodySchema = z.object({
  newVersion: z.string().trim().min(1),
  newFileId: z.string().uuid(),
  notes: z.string().optional(),
  // Tanggal terbit versi baru (YYYY-MM-DD, mis. dibaca dari isi berkas). Bila diisi: tanggal terbit ikut
  // diperbarui dan kedaluwarsa = tanggal terbit + siklus tinjau sub-dokumen (bukan 'akhir tahun ini + 5').
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const { newVersion, newFileId, notes, issueDate } = bodySchema.parse(await req.json());

    const [docRow] = await db.select().from(documents).where(eq(documents.id, params.id)).limit(1);
    if (!docRow || docRow.deletedAt) return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
    assertLocationWrite(user, docRow.location);

    const [newFile] = await db.select().from(fileRegistry).where(eq(fileRegistry.id, newFileId)).limit(1);
    if (!newFile || newFile.uploadStatus !== "uploaded") {
      return NextResponse.json({ error: "Berkas baru belum selesai diunggah atau tidak ditemukan." }, { status: 404 });
    }

    let newExpiryDate = `${new Date().getFullYear() + 5}-12-31`;
    if (issueDate) {
      const today = new Date().toISOString().split("T")[0];
      if (issueDate > today || issueDate < "2000-01-01") {
        return NextResponse.json({ error: "Tanggal terbit tidak valid (tidak boleh di masa depan)." }, { status: 400 });
      }
      let months = 60;
      if (docRow.categoryId) {
        const [cat] = await db.select({ m: documentCategories.reviewCycleMonths }).from(documentCategories).where(eq(documentCategories.id, docRow.categoryId)).limit(1);
        if (cat?.m) months = cat.m;
      }
      const d = new Date(`${issueDate}T00:00:00`);
      d.setMonth(d.getMonth() + months);
      newExpiryDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    const newStatus = docRow.isCircular ? "In Routing" : "Approved";

    await db
      .update(documents)
      .set({
        currentVersion: newVersion,
        primaryFileId: newFileId,
        status: newStatus,
        expiryDate: newExpiryDate,
        ...(issueDate ? { issueDate } : {}),
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
    if (issueDate) diffRows.push({ historyItemId: history.id, field: "Tanggal Terbit", oldValue: docRow.issueDate, newValue: issueDate });
    if (docRow.isCircular) {
      diffRows.push({
        historyItemId: history.id,
        field: "Sirkuler",
        oldValue: "Selesai (putaran lama)",
        newValue: "Tahap 1 (putaran baru)",
      });
    }
    await db.insert(historyDiffs).values(diffRows);

    await logAudit(req, { id: user.id, name: user.name, email: user.email }, "dokumen.direvisi", { targetType: "dokumen", targetId: params.id, targetLabel: `${docRow.documentNumber} ${docRow.title}`, location: docRow.location, detail: { versiLama: docRow.currentVersion, versiBaru: newVersion } });
    const updated = await loadDocumentItem(params.id);
    return NextResponse.json(updated);
  });
}
