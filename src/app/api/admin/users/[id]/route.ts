// Backs assignUserAccess(userId, role, location) — the only mutation path for role/
// location, used both to activate a pending self-registered account and to edit an
// already-active one (see admin/users/page.tsx's "Ubah" action). This route
// re-derives isRegionalAdmin from the submitted role rather than trusting a
// separate flag, so the two can never disagree. The last-admin self-lockout guard
// is enforced HERE now, not just client-side — admin/users/page.tsx's own check is
// only a UX nicety; a direct API call must never be able to strip the last Admin
// Regional's access and leave the tenant with no one who can onboard/manage users.
import { logAudit } from "@/lib/audit";
import { emailVerificationRequired } from "@/lib/auth/emailVerification";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertRegionalAdmin, ForbiddenError } from "@/lib/auth/rbac";
import { withErrorHandling, HttpError } from "@/lib/api/respond";
import { MOC_ROLE_FLAGS } from "@/lib/domain/moc";

const bodySchema = z.object({
  role: z.enum(["Penanggung Jawab PSI (Initiator)", "PSI / MOC Controller", "Admin Regional"]),
  location: z.string().trim().min(1),
  // Opsional: dikirim saat aktivasi agar usulan peran MOC user ikut diterapkan.
  mocRoles: z.array(z.enum(MOC_ROLE_FLAGS)).max(MOC_ROLE_FLAGS.length).optional(),
  mocFunction: z.string().trim().max(100).nullable().optional(),
});

// Menghapus akun. Hanya Admin Regional; tidak boleh menghapus akun sendiri. Akun yang
// sudah tercatat di dokumen/MOC/riwayat/unggahan TIDAK dihapus (jejak audit harus tetap
// menunjuk ke orangnya) — Postgres menolaknya lewat foreign key (23503) dan kita
// jawab 409 dengan pesan yang jelas. Sesi & token atur-ulang sandi ikut terhapus (cascade).
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const admin = await requireSessionUser();
    assertRegionalAdmin(admin);

    if (params.id === admin.id) {
      throw new ForbiddenError("Anda tidak dapat menghapus akun Anda sendiri.");
    }

    const [victim] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, params.id)).limit(1);
    try {
      const deleted = await db.delete(users).where(eq(users.id, params.id)).returning({ id: users.id });
      if (deleted.length === 0) {
        return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
      }
    } catch (err) {
      const code = (err as { code?: string; cause?: { code?: string } })?.code ?? (err as { cause?: { code?: string } })?.cause?.code;
      if (code === "23503") {
        throw new HttpError(
          409,
          "User ini sudah tercatat pada dokumen, MOC, atau riwayat sehingga tidak dapat dihapus. Ubah lokasi/perannya bila aksesnya perlu dicabut."
        );
      }
      throw err;
    }

    await logAudit(req, { id: admin.id, name: admin.name, email: admin.email }, "akun.dihapus", { targetType: "user", targetId: params.id, targetLabel: victim ? `${victim.name} <${victim.email}>` : undefined });
    return NextResponse.json({ ok: true });
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const admin = await requireSessionUser();
    assertRegionalAdmin(admin);

    const { role, location, mocRoles, mocFunction } = bodySchema.parse(await req.json());
    const isRegionalAdmin = role === "Admin Regional";

    if (!isRegionalAdmin) {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(and(eq(users.isRegionalAdmin, true), ne(users.id, params.id)));
      if (count === 0) {
        throw new ForbiddenError("Tidak dapat mencabut akses Admin Regional terakhir yang tersisa.");
      }
    }

    const [before] = await db.select({ role: users.role, location: users.location, emailVerifiedAt: users.emailVerifiedAt }).from(users).where(eq(users.id, params.id)).limit(1);
    // Mengaktifkan akun yang belum punya lokasi = memberi akses. Bila saklar EMAIL_VERIFICATION_REQUIRED=true,
    // emailnya harus sudah terverifikasi dulu (akun lama & akun Google sudah terverifikasi).
    if (before && !before.location && !before.emailVerifiedAt && emailVerificationRequired()) {
      return NextResponse.json({ error: "Email user ini belum terverifikasi. Minta user membuka tautan di emailnya (atau kirim ulang dari Pengaturan › Keamanan Akun) sebelum diaktifkan." }, { status: 409 });
    }
    const [updated] = await db
      .update(users)
      .set({
        role,
        location,
        isRegionalAdmin,
        ...(mocRoles !== undefined
          ? { mocRoles: isRegionalAdmin ? [] : Array.from(new Set(mocRoles)), mocFunction: mocRoles.length > 0 && !isRegionalAdmin ? mocFunction || null : null }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, params.id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
    }

    await logAudit(req, { id: admin.id, name: admin.name, email: admin.email }, "akses.diubah", {
      targetType: "user",
      targetId: updated.id,
      targetLabel: `${updated.name} <${updated.email}>`,
      location: updated.location,
      detail: { dari: before ?? null, ke: { role, location }, peranMoc: mocRoles ?? undefined },
    });
    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      location: updated.location,
      isRegionalAdmin: updated.isRegionalAdmin,
    });
  });
}
