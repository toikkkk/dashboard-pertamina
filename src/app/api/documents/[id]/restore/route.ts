// Pulihkan dokumen dari Sampah. Hak sama dengan menghapus (Admin Regional / Controller lokasi dokumen).
// Riwayat bernada "Dikoreksi:" supaya tidak dihitung sebagai pembaruan nyata di dashboard (isRealUpdate).
import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents, historyItems, historyDiffs } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { ForbiddenError } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";
import { loadDocumentItem } from "@/lib/api/documents";
import { canDeleteDocument } from "@/lib/domain/rules";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const [docRow] = await db.select().from(documents).where(eq(documents.id, params.id)).limit(1);
    if (!docRow || !docRow.deletedAt) return NextResponse.json({ error: "Dokumen tidak ada di Sampah." }, { status: 404 });
    if (!canDeleteDocument(user, docRow.location)) {
      throw new ForbiddenError("Hanya Admin Regional atau Controller PSI lokasi ini yang dapat memulihkan dokumen.");
    }

    await db
      .update(documents)
      .set({ deletedAt: null, deletedById: null, deletedByName: null, updatedAt: new Date() })
      .where(and(eq(documents.id, docRow.id), isNotNull(documents.deletedAt)));

    const [history] = await db
      .insert(historyItems)
      .values({
        documentId: docRow.id,
        actorName: user.name,
        actorRole: user.role,
        location: docRow.location,
        action: "Revised",
        notes: "Dikoreksi: dokumen dipulihkan dari Sampah",
        fileId: docRow.primaryFileId,
        version: docRow.currentVersion,
      })
      .returning({ id: historyItems.id });
    await db.insert(historyDiffs).values({ historyItemId: history.id, field: "Keberadaan", oldValue: "Di Sampah", newValue: "Aktif" });

    await logAudit(req, { id: user.id, name: user.name, email: user.email }, "dokumen.dipulihkan", {
      targetType: "dokumen",
      targetId: docRow.id,
      targetLabel: `${docRow.documentNumber} ${docRow.title}`,
      location: docRow.location,
    });
    return NextResponse.json(await loadDocumentItem(docRow.id));
  });
}
