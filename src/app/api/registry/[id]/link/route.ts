// Promotes one raw file_registry row into a curated `documents` row — the
// deliberate, one-at-a-time, admin-only mechanism the migration plan settled on
// instead of trying to auto-classify all ~2,965 unlinked real files into fake
// approval workflows. Mirrors POST /api/documents' document-creation logic, just
// sourced from an already-uploaded registry file instead of a fresh presigned
// upload.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents, historyItems, fileRegistry } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertRegionalAdmin } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";
import { loadDocumentItem } from "@/lib/api/documents";

const bodySchema = z.object({
  documentNumber: z.string().trim().min(1),
  title: z.string().trim().min(1),
  psiType: z.enum(["Informasi Bahan Berbahaya", "Informasi Teknologi Proses", "Informasi Peralatan", "Sistem Tata Kerja"]),
  auditType: z.string().optional(),
  location: z.string().trim().min(1),
  lifecyclePhase: z.enum(["Proyek", "Operasi", "Decommissioning"]),
  status: z.enum(["Draft", "In Routing", "Approved", "Revision Required", "Expired"]).default("Approved"),
  issueDate: z.string(),
  expiryDate: z.string(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const admin = await requireSessionUser();
    assertRegionalAdmin(admin);
    const body = bodySchema.parse(await req.json());

    const [file] = await db.select().from(fileRegistry).where(eq(fileRegistry.id, params.id)).limit(1);
    if (!file || file.uploadStatus !== "uploaded") {
      return NextResponse.json({ error: "Berkas registry tidak ditemukan atau belum selesai diunggah." }, { status: 404 });
    }

    const [doc] = await db
      .insert(documents)
      .values({
        documentNumber: body.documentNumber,
        title: body.title,
        psiType: body.psiType,
        auditType: body.auditType,
        lifecyclePhase: body.lifecyclePhase,
        location: body.location,
        currentVersion: "1.0",
        status: body.status,
        issueDate: body.issueDate,
        expiryDate: body.expiryDate,
        primaryFileId: file.id,
        isCircular: false,
        createdBy: admin.id,
      })
      .returning();

    await db.insert(historyItems).values({
      documentId: doc.id,
      actorName: admin.name,
      actorRole: admin.role,
      location: body.location,
      action: "Created",
      notes: `Ditautkan dari arsip registry: ${file.originalFilename}`,
      fileId: file.id,
      version: "1.0",
    });

    const item = await loadDocumentItem(doc.id);
    return NextResponse.json(item, { status: 201 });
  });
}
