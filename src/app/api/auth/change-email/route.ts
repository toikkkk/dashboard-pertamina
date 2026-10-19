// Ganti email akun sendiri (mis. dari email penanda ke Gmail agar bisa menerima verifikasi dan atur ulang sandi).
// Wajib kata sandi saat ini. Email baru unik (tanpa membedakan huruf besar/kecil), status verifikasi direset, dan
// email verifikasi dikirim ke alamat baru. Sesi tetap hidup.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { requireSessionUser } from "@/lib/auth/session";
import { issueVerificationEmail } from "@/lib/auth/emailVerification";
import { logAudit } from "@/lib/audit";
import { HttpError, withErrorHandling } from "@/lib/api/respond";

const bodySchema = z.object({ newEmail: z.string().trim().toLowerCase().email().max(200), password: z.string().max(200) });

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const { newEmail, password } = bodySchema.parse(await req.json());

    if (!(await verifyPassword(password, user.passwordHash))) throw new HttpError(400, "Kata sandi salah.");
    if (newEmail === user.email.toLowerCase()) throw new HttpError(400, "Itu sudah email akun Anda.");
    const [taken] = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${newEmail}`).limit(1);
    if (taken) throw new HttpError(409, "Email itu sudah dipakai akun lain.");

    await db.update(users).set({ email: newEmail, emailVerifiedAt: null, updatedAt: new Date() }).where(eq(users.id, user.id));
    const result = await issueVerificationEmail(req.nextUrl.origin, { id: user.id, name: user.name, email: newEmail });
    await logAudit(req, { id: user.id, name: user.name, email: newEmail }, "email.diganti", { targetType: "user", targetId: user.id, detail: { verifikasi: result } });

    const message =
      result === "terkirim"
        ? `Email diganti. Email verifikasi dikirim ke ${newEmail} (berlaku 24 jam).`
        : "Email diganti, tetapi email verifikasi belum dapat dikirim. Coba kirim ulang dari kartu Verifikasi email.";
    return NextResponse.json({ ok: true, email: newEmail, verification: result, message });
  });
}
