// GET: backs `documents` (RBAC-filtered, per psiStore.tsx's original client-side
// filter — now enforced server-side). POST: backs addNewDocument(docData).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents, historyItems, approvalRoutes, fileRegistry } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertLocationWrite, assertOnboarded } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";
import { loadDocumentsForUser, loadAllDocuments, loadDocumentItem } from "@/lib/api/documents";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    // ?scope=all is the pre-existing cross-location benchmarking exception (see
    // CLAUDE.md) — used only by dashboard-wide widgets, never the real document
    // list/actions, which always stay RBAC-scoped to `documents` (the default).
    const scope = req.nextUrl.searchParams.get("scope");
    const items = scope === "all" ? await loadAllDocuments() : await loadDocumentsForUser(user);
    return NextResponse.json(items);
  });
}

const bodySchema = z.object({
  documentNumber: z.string().trim().min(1),
  title: z.string().trim().min(1),
  psiType: z.enum(["Informasi Bahan Berbahaya", "Informasi Teknologi Proses", "Informasi Peralatan", "Sistem Tata Kerja"]),
  auditType: z.string().optional(),
  location: z.string().trim().min(1),
  lifecyclePhase: z.enum(["Proyek", "Operasi", "Decommissioning"]),
  isCircular: z.boolean(),
  routes: z
    .array(
      z.object({
        approverRole: z.string().min(1),
        approverName: z.string().min(1),
        stepOrder: z.number().int().min(1),
      })
    )
    .default([]),
  fileId: z.string().uuid(),
  expiryDate: z.string(),
});

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertOnboarded(user);
    const body = bodySchema.parse(await req.json());
    assertLocationWrite(user, body.location);

    // Without this, an invalid/foreign fileId would surface as a raw Postgres FK
    // violation (500) instead of a clean 404 — and, more importantly, nothing else
    // here would catch a caller passing a fileId whose upload never actually
    // finished (see /api/files/[fileId]/confirm), leaving the document pointing at
    // bytes that don't exist in R2 yet.
    const [file] = await db.select().from(fileRegistry).where(eq(fileRegistry.id, body.fileId)).limit(1);
    if (!file || file.uploadStatus !== "uploaded") {
      return NextResponse.json({ error: "Berkas belum selesai diunggah atau tidak ditemukan." }, { status: 404 });
    }

    const initialStatus = body.isCircular ? "In Routing" : "Approved";
    const issueDate = new Date().toISOString().split("T")[0];

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
        status: initialStatus,
        issueDate,
        expiryDate: body.expiryDate,
        primaryFileId: body.fileId,
        isCircular: body.isCircular,
        createdBy: user.id,
      })
      .returning();

    if (body.isCircular && body.routes.length > 0) {
      await db.insert(approvalRoutes).values(
        body.routes.map((r) => ({
          documentId: doc.id,
          approverRole: r.approverRole,
          approverName: r.approverName,
          stepOrder: r.stepOrder,
          status: "Pending" as const,
        }))
      );
    }

    await db.insert(historyItems).values({
      documentId: doc.id,
      actorName: user.name,
      actorRole: user.role,
      location: body.location,
      action: "Created",
      notes: body.isCircular ? "Diunggah & diajukan untuk sirkuler" : "Direct Approved tanpa sirkuler",
      fileId: body.fileId,
      version: "1.0",
    });

    const item = await loadDocumentItem(doc.id);
    return NextResponse.json(item, { status: 201 });
  });
}
