import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents, documentCategories, historyItems, historyDiffs } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertLocationRead, assertLocationWrite } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";
import { loadDocumentItem, getDocumentLocation } from "@/lib/api/documents";

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

// Satu-satunya hal yang bisa diubah lewat PATCH ini: categoryId — dibuat spesifik
// untuk memperbaiki dokumen lama (sebelum fitur sub-kategori Direktori ada) yang
// belum ditautkan ke kategori manapun, bukan endpoint edit-semua-field.
const patchSchema = z.object({ categoryId: z.string().uuid().nullable() });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const { categoryId } = patchSchema.parse(await req.json());

    const [docRow] = await db.select().from(documents).where(eq(documents.id, params.id)).limit(1);
    if (!docRow) return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
    assertLocationWrite(user, docRow.location);

    let newCategoryName = "(tanpa kategori)";
    if (categoryId) {
      const [cat] = await db
        .select({ id: documentCategories.id, name: documentCategories.name })
        .from(documentCategories)
        .where(and(eq(documentCategories.id, categoryId), eq(documentCategories.location, docRow.location)))
        .limit(1);
      if (!cat) return NextResponse.json({ error: "Sub-kategori tidak ditemukan di lokasi dokumen ini." }, { status: 404 });
      newCategoryName = cat.name;
    }

    let oldCategoryName = "(tanpa kategori)";
    if (docRow.categoryId) {
      const [oldCat] = await db.select({ name: documentCategories.name }).from(documentCategories).where(eq(documentCategories.id, docRow.categoryId)).limit(1);
      if (oldCat) oldCategoryName = oldCat.name;
    }

    await db.update(documents).set({ categoryId, updatedAt: new Date() }).where(eq(documents.id, params.id));

    const [history] = await db
      .insert(historyItems)
      .values({
        documentId: params.id,
        actorName: user.name,
        actorRole: user.role,
        location: docRow.location,
        action: "Revised",
        notes: "Pembaruan sub-kategori dokumen",
        fileId: docRow.primaryFileId,
        version: docRow.currentVersion,
      })
      .returning();
    await db.insert(historyDiffs).values([{ historyItemId: history.id, field: "Sub-kategori", oldValue: oldCategoryName, newValue: newCategoryName }]);

    const updated = await loadDocumentItem(params.id);
    return NextResponse.json(updated);
  });
}
