// Tandai dokumen "sudah ditinjau" (evaluasi tahunan PSI): dokumen dicek dan masih valid, tanpa unggah ulang.
// Tanggal terbit dan masa berlaku TIDAK berubah. Dicatat sebagai riwayat bernada "Ditinjau:" (aksi Revised, sama
// seperti "Dikoreksi:") sehingga tidak dihitung pembaruan isi di dashboard, tetapi mengembalikan jam hitung
// "perlu evaluasi tahunan".
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { historyItems, documents } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertLocationWrite } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";
import { loadDocumentItem } from "@/lib/api/documents";
import { logAudit } from "@/lib/audit";
import { REVIEW_NOTE_PREFIX } from "@/lib/domain/rules";

const bodySchema = z.object({ notes: z.string().trim().max(500).optional() });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const { notes } = bodySchema.parse(await req.json().catch(() => ({})));

    const [docRow] = await db.select().from(documents).where(eq(documents.id, params.id)).limit(1);
    if (!docRow || docRow.deletedAt) return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
    assertLocationWrite(user, docRow.location);

    await db.insert(historyItems).values({
      documentId: docRow.id,
      actorName: user.name,
      actorRole: user.role,
      location: docRow.location,
      action: "Revised",
      notes: `${REVIEW_NOTE_PREFIX} ${notes || "dokumen dicek, masih valid dan tidak ada perubahan"}`,
      fileId: docRow.primaryFileId,
      version: docRow.currentVersion,
    });
    await logAudit(req, { id: user.id, name: user.name, email: user.email }, "dokumen.ditinjau", {
      targetType: "dokumen",
      targetId: docRow.id,
      targetLabel: `${docRow.documentNumber} ${docRow.title}`,
      location: docRow.location,
    });

    return NextResponse.json(await loadDocumentItem(docRow.id));
  });
}
