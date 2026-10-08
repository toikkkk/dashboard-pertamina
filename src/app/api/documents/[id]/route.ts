import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, ne, inArray, or } from "drizzle-orm";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { db } from "@/lib/db/client";
import { documents, documentCategories, historyItems, historyDiffs, fileRegistry, mocEvidence } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertLocationRead, assertLocationWrite, ForbiddenError } from "@/lib/auth/rbac";
import { withErrorHandling, HttpError } from "@/lib/api/respond";
import { loadDocumentItem, getDocumentLocation } from "@/lib/api/documents";
import { canDeleteDocument } from "@/lib/domain/rules";
import { r2, R2_BUCKET } from "@/lib/r2/client";
import { logAudit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const location = await getDocumentLocation(params.id);
    if (location === null) {
      return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
    }
    assertLocationRead(user);

    const item = await loadDocumentItem(params.id);
    return NextResponse.json(item);
  });
}

const PSI_TYPES = ["Informasi Bahan Berbahaya", "Informasi Teknologi Proses", "Informasi Peralatan", "Sistem Tata Kerja"] as const;

// Data dokumen yang boleh diubah user lokasi itu (atau Admin Regional): sub-dokumen, judul, nomor, jenis PSI,
// tanggal terbit (tanggal berlaku DIHITUNG ULANG = terbit + siklus tinjau sub-dokumen) dan penanda
// "tanggal sudah diverifikasi" (menghapus label perkiraan). Berkas & versi tetap lewat /revise.
const patchSchema = z
  .object({
    categoryId: z.string().uuid().nullable().optional(),
    title: z.string().trim().min(1).max(300).optional(),
    documentNumber: z.string().trim().min(1).max(100).optional(),
    psiType: z.enum(PSI_TYPES).optional(),
    issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateVerified: z.boolean().optional(),
  })
  .refine((b) => Object.keys(b).length > 0, { message: "Tidak ada perubahan." });

const addMonthsIso = (iso: string, months: number): string => {
  const d = new Date(`${iso}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Label perkiraan yang ditambahkan skrip verifikasi pada riwayat "Dibuat": "(tanggal terbit perkiraan dari …, belum diverifikasi)".
const ESTIMATE_MARK = /\s*\(tanggal terbit perkiraan[^)]*\)/;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const body = patchSchema.parse(await req.json());

    const [docRow] = await db.select().from(documents).where(eq(documents.id, params.id)).limit(1);
    if (!docRow) return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
    assertLocationWrite(user, docRow.location);

    const catRows = await db.select({ id: documentCategories.id, name: documentCategories.name, months: documentCategories.reviewCycleMonths }).from(documentCategories).where(eq(documentCategories.location, docRow.location));
    const catById = new Map(catRows.map((c) => [c.id, c]));
    const diffs: { field: string; oldValue: string; newValue: string }[] = [];
    const set: Partial<typeof documents.$inferInsert> = {};

    let newCategoryId = docRow.categoryId;
    if (body.categoryId !== undefined && body.categoryId !== docRow.categoryId) {
      if (body.categoryId && !catById.has(body.categoryId)) return NextResponse.json({ error: "Sub-kategori tidak ditemukan di lokasi dokumen ini." }, { status: 404 });
      newCategoryId = body.categoryId;
      set.categoryId = body.categoryId;
      diffs.push({
        field: "Sub-kategori",
        oldValue: (docRow.categoryId && catById.get(docRow.categoryId)?.name) || "(tanpa kategori)",
        newValue: (body.categoryId && catById.get(body.categoryId)?.name) || "(tanpa kategori)",
      });
    }
    if (body.title !== undefined && body.title !== docRow.title) {
      set.title = body.title;
      diffs.push({ field: "Judul", oldValue: docRow.title, newValue: body.title });
    }
    if (body.documentNumber !== undefined && body.documentNumber !== docRow.documentNumber) {
      const [dupe] = await db.select({ id: documents.id }).from(documents).where(and(eq(documents.documentNumber, body.documentNumber), ne(documents.id, docRow.id))).limit(1);
      if (dupe) throw new HttpError(409, "Nomor dokumen itu sudah dipakai dokumen lain.");
      set.documentNumber = body.documentNumber;
      diffs.push({ field: "Nomor Dokumen", oldValue: docRow.documentNumber, newValue: body.documentNumber });
    }
    if (body.psiType !== undefined && body.psiType !== docRow.psiType) {
      set.psiType = body.psiType;
      diffs.push({ field: "Jenis PSI", oldValue: docRow.psiType, newValue: body.psiType });
    }
    if (body.issueDate !== undefined && body.issueDate !== docRow.issueDate) {
      const today = new Date().toISOString().split("T")[0];
      if (body.issueDate > today || body.issueDate < "2000-01-01") throw new HttpError(400, "Tanggal terbit tidak valid (tidak boleh di masa depan).");
      const months = (newCategoryId && catById.get(newCategoryId)?.months) || 60;
      const expiry = addMonthsIso(body.issueDate, months);
      set.issueDate = body.issueDate;
      set.expiryDate = expiry;
      diffs.push({ field: "Tanggal Terbit", oldValue: docRow.issueDate, newValue: body.issueDate });
      diffs.push({ field: "Tanggal Kedaluwarsa", oldValue: docRow.expiryDate, newValue: expiry });
    }

    // Menandai tanggal terverifikasi: hapus label "perkiraan" dari riwayat dokumen ini.
    let verified = false;
    if (body.dateVerified) {
      const created = await db.select({ id: historyItems.id, notes: historyItems.notes }).from(historyItems).where(eq(historyItems.documentId, docRow.id));
      for (const h of created) {
        if (h.notes && ESTIMATE_MARK.test(h.notes)) {
          await db.update(historyItems).set({ notes: h.notes.replace(ESTIMATE_MARK, "") }).where(eq(historyItems.id, h.id));
          verified = true;
        }
      }
      if (verified) diffs.push({ field: "Verifikasi tanggal terbit", oldValue: "perkiraan", newValue: "terverifikasi" });
    }

    if (diffs.length === 0) return NextResponse.json(await loadDocumentItem(docRow.id));

    if (Object.keys(set).length > 0) await db.update(documents).set({ ...set, updatedAt: new Date() }).where(eq(documents.id, docRow.id));

    const onlyCategory = diffs.every((d) => d.field === "Sub-kategori");
    const [history] = await db
      .insert(historyItems)
      .values({
        documentId: docRow.id,
        actorName: user.name,
        actorRole: user.role,
        location: docRow.location,
        action: "Revised",
        // "Dikoreksi:" = koreksi data, tidak dihitung sebagai pembaruan nyata di dashboard (lihat isRealUpdate).
        notes: onlyCategory ? "Pembaruan sub-kategori dokumen" : "Dikoreksi: perubahan data dokumen",
        fileId: docRow.primaryFileId,
        version: docRow.currentVersion,
      })
      .returning();
    await db.insert(historyDiffs).values(diffs.map((d) => ({ historyItemId: history.id, ...d })));
    await logAudit(req, { id: user.id, name: user.name, email: user.email }, "dokumen.diubah", {
      targetType: "dokumen",
      targetId: docRow.id,
      targetLabel: `${docRow.documentNumber} ${docRow.title}`,
      location: docRow.location,
      detail: { perubahan: diffs.map((d) => `${d.field}: ${d.oldValue} → ${d.newValue}`) },
    });

    return NextResponse.json(await loadDocumentItem(docRow.id));
  });
}

// Hapus dokumen: hanya Admin Regional atau Controller lokasi itu. Riwayat/rute ikut terhapus (cascade); berkas di
// penyimpanan dihapus HANYA bila tidak dipakai dokumen/riwayat/bukti MOC lain. Tak terbalik — klien meminta konfirmasi.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const [docRow] = await db.select().from(documents).where(eq(documents.id, params.id)).limit(1);
    if (!docRow) return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
    if (!canDeleteDocument(user, docRow.location)) {
      throw new ForbiddenError("Hanya Admin Regional atau Controller PSI lokasi ini yang dapat menghapus dokumen.");
    }

    const hist = await db.select({ fileId: historyItems.fileId }).from(historyItems).where(eq(historyItems.documentId, docRow.id));
    const fileIds = Array.from(new Set([docRow.primaryFileId, ...hist.map((h) => h.fileId)]));

    try {
      await db.delete(documents).where(eq(documents.id, docRow.id));
    } catch (err) {
      const code = (err as { code?: string; cause?: { code?: string } })?.code ?? (err as { cause?: { code?: string } })?.cause?.code;
      if (code === "23503") throw new HttpError(409, "Dokumen ini masih direferensikan data lain dan tidak dapat dihapus.");
      throw err;
    }

    // Berkas yang sudah tidak dipakai siapa pun → hapus dari R2 lalu dari registry.
    let filesRemoved = 0;
    for (const fid of fileIds) {
      const [a] = await db.select({ id: documents.id }).from(documents).where(eq(documents.primaryFileId, fid)).limit(1);
      const [b] = await db.select({ id: historyItems.id }).from(historyItems).where(eq(historyItems.fileId, fid)).limit(1);
      const [c] = await db.select({ id: mocEvidence.id }).from(mocEvidence).where(eq(mocEvidence.fileId, fid)).limit(1);
      if (a || b || c) continue;
      const [f] = await db.select({ key: fileRegistry.r2ObjectKey }).from(fileRegistry).where(eq(fileRegistry.id, fid)).limit(1);
      if (!f) continue;
      try {
        const res = await r2.send(new DeleteObjectsCommand({ Bucket: R2_BUCKET, Delete: { Objects: [{ Key: f.key }], Quiet: true } }));
        if ((res.Errors ?? []).length === 0) {
          await db.delete(fileRegistry).where(eq(fileRegistry.id, fid));
          filesRemoved += 1;
        }
      } catch (err) {
        console.error("[hapus-dokumen] gagal menghapus berkas", fid, err instanceof Error ? err.message : err);
      }
    }

    await logAudit(req, { id: user.id, name: user.name, email: user.email }, "dokumen.dihapus", {
      targetType: "dokumen",
      targetId: docRow.id,
      targetLabel: `${docRow.documentNumber} ${docRow.title}`,
      location: docRow.location,
      detail: { versi: docRow.currentVersion, terbit: docRow.issueDate, berlaku: docRow.expiryDate, berkasDihapus: filesRemoved, berkasTotal: fileIds.length },
    });
    return NextResponse.json({ ok: true, filesRemoved });
  });
}
