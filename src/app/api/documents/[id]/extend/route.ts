// Backs extendValidity(docId, notes?) — "5-Year Dilemma" option 2: no facility
// change, just push expiryDate out 5 years from its OLD value (not from today —
// same as the client-only prototype), keep the same file/version.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { historyItems, historyDiffs, documents } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertLocationWrite } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";
import { loadDocumentItem } from "@/lib/api/documents";

const bodySchema = z.object({ notes: z.string().optional() });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const { notes } = bodySchema.parse(await req.json().catch(() => ({})));

    const [docRow] = await db.select().from(documents).where(eq(documents.id, params.id)).limit(1);
    if (!docRow) return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
    assertLocationWrite(user, docRow.location);

    const currentYear = new Date(docRow.expiryDate).getFullYear() || 2024;
    const newExpiryDate = `${currentYear + 5}-12-31`;

    await db.update(documents).set({ status: "Approved", expiryDate: newExpiryDate, updatedAt: new Date() }).where(eq(documents.id, params.id));

    const [history] = await db
      .insert(historyItems)
      .values({
        documentId: params.id,
        actorName: user.name,
        actorRole: user.role,
        location: docRow.location,
        action: "Extended Validity",
        notes: notes || `Perpanjangan validitas 5 tahun tanpa perubahan teknis (expired baru: ${newExpiryDate})`,
        fileId: docRow.primaryFileId,
        version: docRow.currentVersion,
      })
      .returning();

    await db.insert(historyDiffs).values([
      { historyItemId: history.id, field: "Tanggal Kedaluwarsa", oldValue: docRow.expiryDate, newValue: newExpiryDate },
      { historyItemId: history.id, field: "Status Dokumen", oldValue: docRow.status, newValue: "Approved" },
    ]);

    const updated = await loadDocumentItem(params.id);
    return NextResponse.json(updated);
  });
}
