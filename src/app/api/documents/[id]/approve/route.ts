// Backs approveStep(docId, stepOrder, comment?). Mirrors psiStore.tsx's
// approveStep exactly (same status-transition and Closed-history-on-completion
// logic), but canUserApproveDoc is re-checked here — the client only used it to
// decide whether to render the approve button, never to actually gate the mutation.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { approvalRoutes, historyItems, historyDiffs, documents } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertLocationWrite, ForbiddenError } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";
import { loadDocumentItem, sessionUserToSimulated } from "@/lib/api/documents";
import { canUserApproveDoc } from "@/lib/domain/rules";

const bodySchema = z.object({
  stepOrder: z.number().int().min(1),
  comment: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const { stepOrder, comment } = bodySchema.parse(await req.json());

    const [docRow] = await db.select().from(documents).where(eq(documents.id, params.id)).limit(1);
    if (!docRow) return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
    assertLocationWrite(user, docRow.location);

    const doc = await loadDocumentItem(params.id);
    if (!doc) return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
    if (!canUserApproveDoc(doc, sessionUserToSimulated(user))) {
      throw new ForbiddenError("Anda tidak berwenang menyetujui dokumen ini pada tahap ini.");
    }

    const actionDate = new Date().toISOString().split("T")[0];
    await db
      .update(approvalRoutes)
      .set({ status: "Approved", actionDate, comment: comment || `Disetujui oleh ${user.name}` })
      .where(
        and(
          eq(approvalRoutes.documentId, params.id),
          eq(approvalRoutes.stepOrder, stepOrder),
          eq(approvalRoutes.status, "Pending")
        )
      );

    const remainingRoutes = await db.select().from(approvalRoutes).where(eq(approvalRoutes.documentId, params.id));
    const allApproved = remainingRoutes.every((r) => r.status === "Approved");
    const newStatus = allApproved ? "Approved" : "In Routing";

    await db.update(documents).set({ status: newStatus, updatedAt: new Date() }).where(eq(documents.id, params.id));

    const [approvedHistory] = await db
      .insert(historyItems)
      .values({
        documentId: params.id,
        actorName: user.name,
        actorRole: user.role,
        location: doc.location,
        action: "Approved",
        notes: `Menyetujui tahap ${stepOrder}. ${comment || ""}`.trim(),
        fileId: docRow.primaryFileId,
        version: doc.currentVersion,
      })
      .returning();

    await db.insert(historyDiffs).values([
      { historyItemId: approvedHistory.id, field: `Tahap ${stepOrder}`, oldValue: "Pending", newValue: "Approved" },
      { historyItemId: approvedHistory.id, field: "Status Dokumen", oldValue: doc.status, newValue: newStatus },
    ]);

    if (allApproved) {
      const [closedHistory] = await db
        .insert(historyItems)
        .values({
          documentId: params.id,
          actorName: user.name,
          actorRole: user.role,
          location: doc.location,
          action: "Closed",
          notes: "Seluruh tahap persetujuan sirkuler selesai, dokumen ditutup.",
          fileId: docRow.primaryFileId,
          version: doc.currentVersion,
        })
        .returning();
      await db.insert(historyDiffs).values({
        historyItemId: closedHistory.id,
        field: "Status Dokumen",
        oldValue: "In Routing",
        newValue: "Approved",
      });
    }

    const updated = await loadDocumentItem(params.id);
    return NextResponse.json(updated);
  });
}
