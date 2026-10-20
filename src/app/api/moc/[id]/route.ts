// GET: detail MOC (hak BACA semua lokasi). PATCH: ubah isi formulir — hanya Initiator
// selama draf / dikembalikan / ditolak (mocActionsFor 'edit').
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mocRequests } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertLocationRead, assertRegionalAdmin } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/audit";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { loadMocItem, mocFormPatchSchema, requireMocAction } from "@/lib/api/moc";

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

// Hapus MOC beserta review, riwayat, bukti, dan PSI terdampaknya (semua ikut terhapus lewat ON DELETE CASCADE).
// Khusus Admin Regional (mis. membersihkan MOC uji coba). Berkas yang pernah dilampirkan tetap ada di arsip.
// Nomor MoC yang dihapus bisa terpakai lagi bila ia nomor terakhir tahun itu; tercatat di Log Aktivitas.
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertRegionalAdmin(user);
    const moc = await loadMocItem(params.id);
    if (!moc) throw new HttpError(404, "MOC tidak ditemukan.");
    await db.delete(mocRequests).where(eq(mocRequests.id, params.id));
    await logAudit(req, { id: user.id, name: user.name, email: user.email }, "moc.dihapus", {
      targetType: "moc",
      targetId: params.id,
      location: moc.location,
      detail: { nomor: moc.mocNumber, judul: moc.judul, status: moc.registerStatus, alur: moc.validationState },
    });
    return NextResponse.json({ ok: true });
  });
}
