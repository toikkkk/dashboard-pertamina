// Promotes one raw file_registry row into a curated `documents` row — the
// deliberate, one-at-a-time mechanism (Admin Regional, atau user terminal untuk berkas arsip TERMINALNYA sendiri) the migration plan settled on
// instead of trying to auto-classify all ~2,965 unlinked real files into fake
// approval workflows. Mirrors POST /api/documents' document-creation logic, just
// sourced from an already-uploaded registry file instead of a fresh presigned
// upload.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents, historyItems, fileRegistry, documentCategories } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertLocationWrite, assertOnboarded, ForbiddenError } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, HttpError } from "@/lib/api/respond";
import { loadDocumentItem } from "@/lib/api/documents";

const bodySchema = z.object({
  documentNumber: z.string().trim().min(1),
  title: z.string().trim().min(1),
  psiType: z.enum(["Informasi Bahan Berbahaya", "Informasi Teknologi Proses", "Informasi Peralatan", "Sistem Tata Kerja"]),
  location: z.string().trim().min(1),
  lifecyclePhase: z.enum(["Proyek", "Operasi", "Decommissioning"]),
  status: z.enum(["Draft", "In Routing", "Approved", "Revision Required", "Expired"]).default("Approved"),
  issueDate: z.string(),
  expiryDate: z.string(),
  // Sub-kategori grid Direktori (2026-09-28) — opsional, sama seperti /api/documents.
  categoryId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertOnboarded(user);
    const body = bodySchema.parse(await req.json());
    assertLocationWrite(user, body.location);

    const [file] = await db.select().from(fileRegistry).where(eq(fileRegistry.id, params.id)).limit(1);
    if (!file || file.uploadStatus !== "uploaded") {
      return NextResponse.json({ error: "Berkas registry tidak ditemukan atau belum selesai diunggah." }, { status: 404 });
    }

    // User terminal hanya boleh menautkan berkas arsip terminalnya sendiri (Admin Regional: bebas).
    if (!user.isRegionalAdmin && file.locationCanonical !== user.location) throw new ForbiddenError();

    // Nomor dokumen unik (termasuk yang sedang di Sampah).
    const [numberTaken] = await db.select({ id: documents.id, deletedAt: documents.deletedAt }).from(documents).where(eq(documents.documentNumber, body.documentNumber)).limit(1);
    if (numberTaken) {
      throw new HttpError(409, numberTaken.deletedAt ? "Nomor dokumen itu dipakai dokumen yang ada di Sampah. Pulihkan atau hapus permanen dokumen itu dulu." : "Nomor dokumen itu sudah dipakai dokumen lain.");
    }

    // Cegah menautkan berkas yang sudah jadi dokumen lain (mis. dua tab admin
    // terbuka bersamaan) — daftar registry sendiri sudah menyembunyikan berkas
    // yang sudah tertaut, ini pengaman sisi server untuk kasus itu.
    const [alreadyLinked] = await db.select({ id: documents.id }).from(documents).where(eq(documents.primaryFileId, file.id)).limit(1);
    if (alreadyLinked) {
      return NextResponse.json({ error: "Berkas ini sudah ditautkan ke dokumen lain di Direktori." }, { status: 409 });
    }

    if (body.categoryId) {
      const [cat] = await db.select({ id: documentCategories.id, location: documentCategories.location }).from(documentCategories).where(eq(documentCategories.id, body.categoryId)).limit(1);
      if (!cat) return NextResponse.json({ error: "Sub-kategori tidak ditemukan." }, { status: 404 });
      if (cat.location !== body.location) throw new HttpError(400, "Sub-kategori itu bukan milik lokasi dokumen ini.");
    }

    const [doc] = await db
      .insert(documents)
      .values({
        documentNumber: body.documentNumber,
        title: body.title,
        psiType: body.psiType,
        lifecyclePhase: body.lifecyclePhase,
        location: body.location,
        currentVersion: "1.0",
        status: body.status,
        issueDate: body.issueDate,
        expiryDate: body.expiryDate,
        primaryFileId: file.id,
        categoryId: body.categoryId,
        isCircular: false,
        createdBy: user.id,
      })
      .returning();

    await db.insert(historyItems).values({
      documentId: doc.id,
      actorName: user.name,
      actorRole: user.role,
      location: body.location,
      action: "Created",
      notes: `Ditautkan dari arsip registry: ${file.originalFilename}`,
      fileId: file.id,
      version: "1.0",
    });

    await logAudit(req, { id: user.id, name: user.name, email: user.email }, "dokumen.dibuat", {
      targetType: "dokumen",
      targetId: doc.id,
      targetLabel: `${doc.documentNumber} ${doc.title}`,
      location: body.location,
      detail: { dariArsipRegistry: file.originalFilename },
    });
    const item = await loadDocumentItem(doc.id);
    return NextResponse.json(item, { status: 201 });
  });
}
