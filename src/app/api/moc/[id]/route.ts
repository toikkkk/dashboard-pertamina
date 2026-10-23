// GET: detail MOC (hak BACA semua lokasi). PATCH: ubah isi formulir — hanya Initiator
// selama draf / dikembalikan / ditolak (mocActionsFor 'edit').
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mocRequests } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertLocationRead } from "@/lib/auth/rbac";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { loadMocItem, mocFormPatchSchema, requireMocAction } from "@/lib/api/moc";
import { moveMocToTrash } from "@/lib/api/mocTrash";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertLocationRead(user);
    const moc = await loadMocItem(params.id);
    if (!moc) throw new HttpError(404, "MOC tidak ditemukan.");
    return NextResponse.json(moc);
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    await requireMocAction(params.id, user, "edit");
    const patch = mocFormPatchSchema.parse(await req.json());
    await db.update(mocRequests).set({ ...patch, updatedAt: new Date() }).where(eq(mocRequests.id, params.id));
    return NextResponse.json(await loadMocItem(params.id));
  });
}

// Hapus MOC = PINDAH KE SAMPAH (bisa dipulihkan 30 hari; lihat lib/api/mocTrash.ts). Khusus Admin Regional
// (mis. membersihkan MOC uji coba). Hapus permanen ada di halaman Sampah atau otomatis lewat tugas terjadwal.
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const purgeAt = await moveMocToTrash(req, user, params.id);
    return NextResponse.json({ ok: true, movedToTrash: true, purgeAt: purgeAt.toISOString() });
  });
}
