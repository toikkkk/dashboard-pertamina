// PSI terdampak per MOC. GET: semua user onboarded. POST/DELETE: pembuat MOC atau Controller lokasi (mocCanEditAffected).
// Dokumen harus berada di lokasi yang sama dengan MOC dan belum di Sampah.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents, mocAffectedDocs } from "@/lib/db/schema";
import { requireSessionUser, type SessionUser } from "@/lib/auth/session";
import { ForbiddenError, assertLocationRead } from "@/lib/auth/rbac";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { loadMocItem, recordMocHistory, sessionUserToMocActor } from "@/lib/api/moc";
import { loadAffectedDocs } from "@/lib/api/mocAffected";
import { mocCanEditAffected } from "@/lib/domain/moc";

const bodySchema = z.object({ documentId: z.string().uuid() });

async function loadEditable(id: string, user: SessionUser) {
  const moc = await loadMocItem(id);
  if (!moc) throw new HttpError(404, "MOC tidak ditemukan.");
  if (!mocCanEditAffected(moc, sessionUserToMocActor(user))) throw new ForbiddenError("Hanya pembuat MOC atau Controller lokasi yang dapat mengubah PSI terdampak.");
  return moc;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertLocationRead(user);
    return NextResponse.json({ items: await loadAffectedDocs(params.id) });
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const moc = await loadEditable(params.id, user);
    const { documentId } = bodySchema.parse(await req.json());
    const [doc] = await db
      .select({ id: documents.id, location: documents.location, version: documents.currentVersion, number: documents.documentNumber })
      .from(documents)
      .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
      .limit(1);
    if (!doc) throw new HttpError(404, "Dokumen tidak ditemukan.");
    if (doc.location !== moc.location) throw new HttpError(400, "Dokumen terdampak harus berada di lokasi yang sama dengan MOC.");
    const inserted = await db
      .insert(mocAffectedDocs)
      .values({ mocId: moc.id, documentId: doc.id, baselineVersion: doc.version, addedBy: user.id })
      .onConflictDoNothing()
      .returning({ id: mocAffectedDocs.id });
    if (inserted.length === 0) throw new HttpError(409, "Dokumen ini sudah ditandai terdampak.");
    await recordMocHistory(moc.id, user, "PSI Terdampak Diubah", { notes: `Ditandai terdampak: ${doc.number} (versi ${doc.version}).` });
    return NextResponse.json({ items: await loadAffectedDocs(moc.id) });
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const moc = await loadEditable(params.id, user);
    const { documentId } = bodySchema.parse(await req.json());
    const removed = await db
      .delete(mocAffectedDocs)
      .where(and(eq(mocAffectedDocs.mocId, moc.id), eq(mocAffectedDocs.documentId, documentId)))
      .returning({ id: mocAffectedDocs.id });
    if (removed.length === 0) throw new HttpError(404, "Dokumen itu tidak ada di daftar terdampak.");
    await recordMocHistory(moc.id, user, "PSI Terdampak Diubah", { notes: "Satu dokumen dilepas dari daftar terdampak." });
    return NextResponse.json({ items: await loadAffectedDocs(moc.id) });
  });
}
