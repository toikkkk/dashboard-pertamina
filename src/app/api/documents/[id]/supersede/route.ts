// Tandai dokumen sebagai "Digantikan" oleh dokumen lain (versi lama yang sudah ada penggantinya), atau batalkan
// (undo). Penandaan MANUAL oleh user lokasi itu atau Admin Regional. Dicatat sebagai riwayat Revised bernada
// "Digantikan:" / "Aktif kembali:" (lihat domain/rules.ts); dokumen tidak diubah dan tetap tersimpan.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents, historyItems } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertLocationWrite } from "@/lib/auth/rbac";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { loadDocumentItem } from "@/lib/api/documents";
import { logAudit } from "@/lib/audit";
import { SUPERSEDE_NOTE_PREFIX, UNSUPERSEDE_NOTE_PREFIX, isSupersededDoc } from "@/lib/domain/rules";

const bodySchema = z.union([z.object({ byDocumentId: z.string().uuid() }), z.object({ undo: z.literal(true) })]);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const body = bodySchema.parse(await req.json());

    const [docRow] = await db.select().from(documents).where(eq(documents.id, params.id)).limit(1);
    if (!docRow || docRow.deletedAt) return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
    assertLocationWrite(user, docRow.location);
    const current = await loadDocumentItem(docRow.id);
    const label = `${docRow.documentNumber} ${docRow.title}`;
    const undo = "undo" in body;

    let notes: string;
    if (undo) {
      if (!current || !isSupersededDoc(current)) throw new HttpError(409, "Dokumen ini tidak berstatus Digantikan.");
      notes = `${UNSUPERSEDE_NOTE_PREFIX} dokumen kembali dianggap berlaku`;
    } else {
      if (body.byDocumentId === docRow.id) throw new HttpError(400, "Dokumen tidak bisa menggantikan dirinya sendiri.");
      const [by] = await db.select().from(documents).where(and(eq(documents.id, body.byDocumentId), isNull(documents.deletedAt))).limit(1);
      if (!by) throw new HttpError(404, "Dokumen pengganti tidak ditemukan.");
      if (by.location !== docRow.location) throw new HttpError(400, "Dokumen pengganti harus berada di lokasi yang sama.");
      notes = `${SUPERSEDE_NOTE_PREFIX} oleh ${by.documentNumber} - ${by.title} [${by.id}]`;
    }

    await db.insert(historyItems).values({
      documentId: docRow.id,
      actorName: user.name,
      actorRole: user.role,
      location: docRow.location,
      action: "Revised",
      notes,
      fileId: docRow.primaryFileId,
      version: docRow.currentVersion,
    });
    await logAudit(req, { id: user.id, name: user.name, email: user.email }, undo ? "dokumen.aktif_kembali" : "dokumen.digantikan", {
      targetType: "dokumen",
      targetId: docRow.id,
      targetLabel: label,
      location: docRow.location,
    });
    return NextResponse.json(await loadDocumentItem(docRow.id));
  });
}
