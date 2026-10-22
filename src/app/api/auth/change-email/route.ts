// Ganti email akun sendiri. Email BELUM berubah saat diminta: tautan konfirmasi dikirim ke ALAMAT BARU (bukti bahwa
// alamat itu milik pemohon), dan email akun baru berganti setelah tautannya dibuka (lihat verify-email). Wajib kata
// sandi saat ini. Email lama (bila bukan email penanda) diberi pemberitahuan sebagai peringatan dini.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { requireSessionUser } from "@/lib/auth/session";
import { issueEmailChange } from "@/lib/auth/emailVerification";
import { sendEmailChangeNotice } from "@/lib/email/sendVerificationEmail";
import { logAudit } from "@/lib/audit";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { isPlaceholderEmail } from "@/lib/domain/rules";

const bodySchema = z.object({ newEmail: z.string().trim().toLowerCase().email().max(200), password: z.string().max(200) });

const mask = (e: string) => {
  const [l, d] = e.split("@");
  return `${l.slice(0, 1)}***@${d}`;
};

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const { newEmail, password } = bodySchema.parse(await req.json());

    if (!(await verifyPassword(password, user.passwordHash))) throw new HttpError(400, "Kata sandi salah.");
    if (newEmail === user.email.toLowerCase()) throw new HttpError(400, "Itu sudah email akun Anda.");
    if (isPlaceholderEmail(newEmail)) throw new HttpError(400, "Pakai email aktif yang bisa menerima pesan.");
    const [taken] = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${newEmail}`).limit(1);
    if (taken) throw new HttpError(409, "Email itu sudah dipakai akun lain.");

    const result = await issueEmailChange(req.nextUrl.origin, { id: user.id, name: user.name }, newEmail);
    if (result === "dibatasi") throw new HttpError(429, "Permintaan terlalu sering. Coba lagi dalam beberapa menit.");
    if (result === "gagal") throw new HttpError(502, "Email konfirmasi gagal dikirim. Periksa alamat email, lalu coba lagi atau hubungi Admin Regional.");

    // Peringatan dini ke email lama; kegagalannya tidak menghalangi permintaan.
    if (!isPlaceholderEmail(user.email)) {
      try {
        await sendEmailChangeNotice({ to: user.email, name: user.name, newEmailMasked: mask(newEmail) });
      } catch (err) {
        console.error("[ganti-email] pemberitahuan ke email lama gagal:", err instanceof Error ? err.message : err);
      }
    }
    await logAudit(req, { id: user.id, name: user.name, email: user.email }, "email.ganti_diminta", { targetType: "user", targetId: user.id, detail: { emailBaru: mask(newEmail) } });

    return NextResponse.json({ ok: true, pendingEmail: newEmail, message: `Tautan konfirmasi dikirim ke ${newEmail} (berlaku 24 jam). Email akun berganti setelah tautan itu dibuka.` });
  });
}
