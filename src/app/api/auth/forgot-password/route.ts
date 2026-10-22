// Langkah 1 atur ulang kata sandi. Atas permintaan (22 Okt 2026) jawabannya TIDAK lagi seragam: email yang tidak
// terdaftar dijawab jelas ("Email tidak terdaftar"), begitu juga pembatasan dan kegagalan kirim. Konsekuensinya
// orang bisa menebak email mana yang terdaftar, jadi dibatasi per alamat jaringan (IP) supaya tidak bisa dipakai
// menyisir daftar email atau membanjiri kotak masuk seseorang.
import { randomBytes, createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, passwordResetTokens, loginAttempts } from "@/lib/db/schema";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { sendPasswordResetEmail } from "@/lib/email/sendPasswordResetEmail";

const bodySchema = z.object({ email: z.string().trim().email().max(255) });

const TOKEN_TTL_MINUTES = 30;
const MAX_REQUESTS_PER_HOUR = 3; // per akun
const MAX_REQUESTS_PER_IP_PER_15_MIN = 10;
const IP_KEY = "reset-ip";
const PLACEHOLDER_EMAIL = /@akun\.portal\.invalid$/i;

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const { email } = bodySchema.parse(await req.json());
    const normalizedEmail = email.toLowerCase();
    const ipAddress = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;

    // Batas per IP: tiap permintaan dicatat (berhasil atau tidak) sebelum memeriksa email.
    if (ipAddress) {
      const since = new Date(Date.now() - 15 * 60 * 1000);
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(loginAttempts)
        .where(and(eq(loginAttempts.email, IP_KEY), eq(loginAttempts.ipAddress, ipAddress), gt(loginAttempts.createdAt, since)));
      if (count >= MAX_REQUESTS_PER_IP_PER_15_MIN) throw new HttpError(429, "Terlalu banyak permintaan dari perangkat ini. Coba lagi beberapa menit lagi.");
      await db.insert(loginAttempts).values({ email: IP_KEY, success: false, ipAddress });
    }

    const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (!user) throw new HttpError(404, "Email tidak terdaftar.");
    if (PLACEHOLDER_EMAIL.test(user.email)) {
      throw new HttpError(400, "Akun ini masih memakai email bawaan sistem yang tidak bisa menerima pesan. Hubungi Admin Regional untuk mengatur ulang kata sandi.");
    }

    const windowStart = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await db
      .select({ createdAt: passwordResetTokens.createdAt })
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.userId, user.id), gt(passwordResetTokens.createdAt, windowStart)));
    if (recent.length >= MAX_REQUESTS_PER_HOUR) {
      const oldest = Math.min(...recent.map((r) => r.createdAt.getTime()));
      const minutes = Math.max(1, Math.ceil((oldest + 60 * 60 * 1000 - Date.now()) / 60000));
      throw new HttpError(429, `Permintaan terlalu sering. Coba lagi sekitar ${minutes} menit lagi.`);
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);
    await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash, expiresAt });

    const resetUrl = `${req.nextUrl.origin}/reset-password?token=${token}`;
    try {
      await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl, expiresInMinutes: TOKEN_TTL_MINUTES });
    } catch (err) {
      console.error("Failed to send password reset email:", err);
      // Token dibatalkan supaya kegagalan kirim tidak menghabiskan jatah permintaan per jam.
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash));
      throw new HttpError(502, "Email gagal dikirim. Coba lagi sebentar lagi, atau hubungi Admin Regional.");
    }

    return NextResponse.json({ message: "Tautan atur ulang kata sandi sudah dikirim." });
  });
}
