// Backs rejectStep(docId, stepOrder, comment) — mirrors psiStore.tsx's rejectStep.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { approvalRoutes, historyItems, historyDiffs, documents } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertLocationAccess } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";
import { loadDocumentItem } from "@/lib/api/documents";

const bodySchema = z.object({
  stepOrder: z.number().int().min(1),
  comment: z.string().trim().min(1),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const { stepOrder, comment } = bodySchema.parse(await req.json());

    const [docRow] = await db.select().from(documents).where(eq(documents.id, params.id)).limit(1);
    if (!docRow) return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
    assertLocationAccess(user, docRow.location);

    const actionDate = new Date().toISOString().split("T")[0];
    await db
      .update(approvalRoutes)
      .set({ status: "Rejected", actionDate, comment })
      .where(
        and(
          eq(approvalRoutes.documentId, params.id),
          eq(approvalRoutes.stepOrder, stepOrder),
          eq(approvalRoutes.status, "Pending")
        )
      );

    await db.update(documents).set({ status: "Revision Required", updatedAt: new Date() }).where(eq(documents.id, params.id));

    const [history] = await db
      .insert(historyItems)
      .values({
        documentId: params.id,
        actorName: user.name,
        actorRole: user.role,
        location: docRow.location,
        action: "Rejected",
        notes: `Menolak dokumen di tahap ${stepOrder}: ${comment}`,
        fileId: docRow.primaryFileId,
        version: docRow.currentVersion,
      })
      .returning();

    await db.insert(historyDiffs).values([
      { historyItemId: history.id, field: `Tahap ${stepOrder}`, oldValue: "Pending", newValue: "Rejected" },
      { historyItemId: history.id, field: "Status Dokumen", oldValue: docRow.status, newValue: "Revision Required" },
    ]);

    const updated = await loadDocumentItem(params.id);
    return NextResponse.json(updated);
  });
}
