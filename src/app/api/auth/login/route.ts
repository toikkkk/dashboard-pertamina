// The email lookup + password check that clean-minimal-sign-in.tsx used to do
// CLIENT-SIDE over the full `users` array (matching on email, never actually
// checking the password). That could never survive a real backend — password
// hashes must never be sent to an unauthenticated client — so this route is the
// one genuinely new piece of logic, not just a relocation of existing code.
import { logAudit } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, loginAttempts, mfaChallenges } from "@/lib/db/schema";
import { randomBytes, createHash } from "crypto";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, SIM_MULTI_SESSION } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api/respond";

// `identifier` = email ATAU username. `email` tetap diterima agar klien lama tidak rusak.
const bodySchema = z
  .object({
    identifier: z.string().trim().min(1).max(255).optional(),
    email: z.string().trim().min(1).max(255).optional(),
    password: z.string().min(1).max(200),
  })
  .refine((b) => !!(b.identifier ?? b.email), { message: "Email atau username wajib diisi." });

const RATE_LIMIT_WINDOW_MINUTES = 15;
const RATE_LIMIT_MAX_FAILURES = 5;

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const body = bodySchema.parse(await req.json());
    const password = body.password;
    // Kunci pembatasan percobaan memakai pengenal yang diketik (email atau username).
    const normalizedEmail = (body.identifier ?? body.email ?? "").toLowerCase();
    const byEmail = normalizedEmail.includes("@");
    const ipAddress = req.headers.get("x-forwarded-for");

    const recordAttempt = (success: boolean) =>
      db.insert(loginAttempts).values({ email: normalizedEmail, success, ipAddress });

    // Checked BEFORE touching users/bcrypt — a scripted brute-force against one
    // account gets a flat 429 regardless of whether the email exists, so this
    // can't be used to distinguish valid from invalid emails either.
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
    const [{ count: recentFailures }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.email, normalizedEmail),
          eq(loginAttempts.success, false),
          gt(loginAttempts.createdAt, windowStart)
        )
      );
    if (recentFailures >= RATE_LIMIT_MAX_FAILURES) {
      await logAudit(req, { email: normalizedEmail }, "login.diblokir", { detail: { alasan: "terlalu banyak percobaan gagal" } });
      return NextResponse.json(
        { error: `Terlalu banyak percobaan gagal. Coba lagi setelah ${RATE_LIMIT_WINDOW_MINUTES} menit.` },
        { status: 429 }
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(byEmail ? eq(users.email, normalizedEmail) : sql`lower(${users.username}) = ${normalizedEmail}`)
      .limit(1);
    // Same generic message whether the email doesn't exist or the password is
    // wrong — don't leak which case it was.
    const invalid = async () => {
      await recordAttempt(false);
      await logAudit(req, { id: user?.id ?? null, email: normalizedEmail }, "login.gagal");
      return NextResponse.json({ error: "Email/username atau kata sandi salah." }, { status: 401 });
    };

    if (!user) return invalid();
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return invalid();

    // Akun ber-MFA: sandi benar BELUM cukup — terbitkan tantangan jangka pendek (tanpa sesi). Kode yang salah
    // dicatat sebagai kegagalan atas email akun ini (lihat mfa/verify), jadi orang yang sudah tahu sandi pun
    // tidak bisa menebak kode tanpa batas: setelah 5 kegagalan dalam 15 menit, tantangan baru ditolak.
    if (user.mfaEnabled) {
      const [{ count: mfaFailures }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(loginAttempts)
        .where(and(eq(loginAttempts.email, `mfa:${user.email.toLowerCase()}`), eq(loginAttempts.success, false), gt(loginAttempts.createdAt, windowStart)));
      if (mfaFailures >= RATE_LIMIT_MAX_FAILURES) {
        await logAudit(req, { id: user.id, name: user.name, email: user.email }, "login.diblokir", { detail: { alasan: "terlalu banyak kode MFA salah" } });
        return NextResponse.json({ error: `Terlalu banyak kode verifikasi yang salah. Coba lagi setelah ${RATE_LIMIT_WINDOW_MINUTES} menit.` }, { status: 429 });
      }
      const challenge = randomBytes(32).toString("hex");
      await db.delete(mfaChallenges).where(eq(mfaChallenges.userId, user.id));
      await db.insert(mfaChallenges).values({
        userId: user.id,
        tokenHash: createHash("sha256").update(challenge).digest("hex"),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
      await logAudit(req, { id: user.id, name: user.name, email: user.email }, "login.mfa_diminta");
      return NextResponse.json({ mfaRequired: true, challenge });
    }

    await recordAttempt(true);
    await logAudit(req, { id: user.id, name: user.name, email: user.email }, "login.berhasil", { location: user.location });
    const sessionToken = await createSession(user.id);

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      location: user.location,
      isRegionalAdmin: user.isRegionalAdmin,
      // SIMULASI SEMENTARA (lihat auth/session.ts): token per-tab, hanya bila sakelar aktif.
      ...(SIM_MULTI_SESSION ? { simToken: sessionToken } : {}),
    });
  });
}
