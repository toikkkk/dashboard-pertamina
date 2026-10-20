import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents, documentCategories, historyItems, historyDiffs } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertLocationRead, assertLocationWrite, ForbiddenError } from "@/lib/auth/rbac";
import { withErrorHandling, HttpError } from "@/lib/api/respond";
import { loadDocumentItem, getDocumentLocation } from "@/lib/api/documents";
import { moveToTrash } from "@/lib/api/trash";
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
    // "Berlaku sampai" manual (menimpa hitungan terbit + siklus): hanya Admin Regional.
    expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateVerified: z.boolean().optional(),
    notes: z.string().trim().max(500).optional(),
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
    if (!docRow || docRow.deletedAt) return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
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
      const [dupe] = await db.select({ id: documents.id, deletedAt: documents.deletedAt }).from(documents).where(and(eq(documents.documentNumber, body.documentNumber), ne(documents.id, docRow.id))).limit(1);
      if (dupe) throw new HttpError(409, dupe.deletedAt ? "Nomor dokumen itu dipakai dokumen yang ada di Sampah. Pulihkan atau hapus permanen dokumen itu dulu." : "Nomor dokumen itu sudah dipakai dokumen lain.");
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

    // "Berlaku sampai" manual: menimpa hitungan otomatis (mis. sertifikat yang tanggal berlakunya tercetak sendiri).
    if (body.expiryDate !== undefined) {
      if (!user.isRegionalAdmin) throw new ForbiddenError("Hanya Admin Regional yang dapat mengubah tanggal berlaku secara manual.");
      const issueEff = (set.issueDate as string | undefined) ?? docRow.issueDate;
      if (body.expiryDate < issueEff) throw new HttpError(400, "Tanggal berlaku tidak boleh sebelum tanggal terbit.");
      const autoIdx = diffs.findIndex((d) => d.field === "Tanggal Kedaluwarsa");
      if (autoIdx >= 0) diffs.splice(autoIdx, 1);
      set.expiryDate = body.expiryDate;
      if (body.expiryDate !== docRow.expiryDate) {
        diffs.push({ field: "Tanggal Kedaluwarsa (diubah manual)", oldValue: docRow.expiryDate, newValue: body.expiryDate });
        if (docRow.status === "Expired" && body.expiryDate >= new Date().toISOString().split("T")[0]) set.status = "Approved";
      } else if (autoIdx < 0) {
        delete set.expiryDate;
      }
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
        notes: (onlyCategory ? "Pembaruan sub-kategori dokumen" : "Dikoreksi: perubahan data dokumen") + (body.notes ? `. Catatan: ${body.notes}` : ""),
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

// Hapus dokumen = PINDAH KE SAMPAH (bisa dipulihkan 30 hari; lihat domain/trash.ts dan lib/api/trash.ts). Hanya
// Admin Regional atau user terminal itu (peran apa pun). Berkas di penyimpanan TIDAK disentuh sampai dihapus permanen
// (tombol di halaman Sampah atau cron setelah 30 hari).
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const [docRow] = await db.select().from(documents).where(eq(documents.id, params.id)).limit(1);
    if (!docRow) return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
    const purgeAt = await moveToTrash(req, user, docRow);
    return NextResponse.json({ ok: true, movedToTrash: true, purgeAt: purgeAt.toISOString() });
  });
}
