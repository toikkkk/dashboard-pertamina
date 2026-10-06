// Admin-only correction tool for a history entry's metadata — added because archive
// migration work (see CLAUDE.md) creates "Created" entries stamped with the
// migration date and the admin's own name, not the document's real original
// author/date. Deliberately does NOT allow editing `action`, `fileId`, or `version`
// — those are the factual record of what happened; only who/when/notes are
// correctable, same as fixing a typo in a paper log, not rewriting what occurred.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { historyItems } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertRegionalAdmin } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";
import { loadDocumentItem } from "@/lib/api/documents";

const bodySchema = z.object({
  timestamp: z.string().min(1).optional(),
  actorName: z.string().trim().min(1).optional(),
  actorRole: z.string().trim().min(1).optional(),
  notes: z.string().trim().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string; historyId: string } }) {
  return withErrorHandling(async () => {
    const admin = await requireSessionUser();
    assertRegionalAdmin(admin);
    const body = bodySchema.parse(await req.json());

    const [row] = await db
      .select({ id: historyItems.id })
      .from(historyItems)
      .where(and(eq(historyItems.id, params.historyId), eq(historyItems.documentId, params.id)))
      .limit(1);
    if (!row) return NextResponse.json({ error: "Entri riwayat tidak ditemukan." }, { status: 404 });

    const updates: Partial<typeof historyItems.$inferInsert> = {};
    if (body.timestamp) {
      const parsed = new Date(body.timestamp);
      if (Number.isNaN(parsed.getTime())) return NextResponse.json({ error: "Format tanggal tidak valid." }, { status: 400 });
      updates.timestamp = parsed;
    }
    if (body.actorName !== undefined) updates.actorName = body.actorName;
    if (body.actorRole !== undefined) updates.actorRole = body.actorRole;
    if (body.notes !== undefined) updates.notes = body.notes || null;

    if (Object.keys(updates).length > 0) {
      await db.update(historyItems).set(updates).where(eq(historyItems.id, params.historyId));
    }

    const updated = await loadDocumentItem(params.id);
    return NextResponse.json(updated);
  });
}
