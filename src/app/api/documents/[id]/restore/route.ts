// Pulihkan dokumen dari Sampah. Hak sama dengan menghapus (Admin Regional, atau user terminal dokumen itu);
// logikanya di lib/api/trash.ts (dipakai juga aksi massal).
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api/respond";
import { loadDocumentItem } from "@/lib/api/documents";
import { restoreFromTrash } from "@/lib/api/trash";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const [docRow] = await db.select().from(documents).where(eq(documents.id, params.id)).limit(1);
    if (!docRow) return NextResponse.json({ error: "Dokumen tidak ada di Sampah." }, { status: 404 });
    await restoreFromTrash(req, user, docRow);
    return NextResponse.json(await loadDocumentItem(docRow.id));
  });
}
