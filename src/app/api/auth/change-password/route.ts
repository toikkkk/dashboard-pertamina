// Ganti kata sandi akun sendiri (wajib untuk akun bersandi awal). Memerlukan sandi lama; sandi baru harus memenuhi
// kebijakan dan berbeda dari yang lama. Sesi lain milik akun ini dicabut, sesi yang sedang dipakai tetap hidup.
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db/client";
import { sessions, users } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { requireSessionUser } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { isPlaceholderEmail, passwordPolicyIssues } from "@/lib/domain/rules";

const bodySchema = z.object({ currentPassword: z.string().max(200), newPassword: z.string().max(200) });

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser({ allowMustChange: true });
    const { currentPassword, newPassword } = bodySchema.parse(await req.json());

    if (isPlaceholderEmail(user.email)) throw new HttpError(400, "Ganti email bawaan dengan email aktif Anda dulu di Pengaturan > Keamanan Akun, baru kata sandi bisa diganti.");
    if (!(await verifyPassword(currentPassword, user.passwordHash))) throw new HttpError(400, "Kata sandi saat ini salah.");
    if (currentPassword === newPassword) throw new HttpError(400, "Kata sandi baru harus berbeda dari yang lama.");
    const issues = passwordPolicyIssues(newPassword);
    if (issues.length > 0) throw new HttpError(400, `Kata sandi belum memenuhi syarat: ${issues.join(", ")}.`);

    const passwordHash = await hashPassword(newPassword);
    await db.update(users).set({ passwordHash, mustChangePassword: false, updatedAt: new Date() }).where(eq(users.id, user.id));

    // Cabut sesi lain; pertahankan sesi ini (cookie berisi token mentah, tabel menyimpan sha256-nya).
    const raw = cookies().get(process.env.SESSION_COOKIE_NAME ?? "psi_session")?.value;
    if (raw) {
      const keep = createHash("sha256").update(raw).digest("hex");
      await db.delete(sessions).where(and(eq(sessions.userId, user.id), ne(sessions.tokenHash, keep)));
    }
    await logAudit(req, { id: user.id, name: user.name, email: user.email }, "sandi.diganti", { targetType: "user", targetId: user.id, detail: { wajibGanti: user.mustChangePassword } });
    return NextResponse.json({ ok: true });
  });
}
