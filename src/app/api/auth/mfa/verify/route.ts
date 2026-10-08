// Langkah 2 login ber-MFA: tukar tantangan (diterbitkan setelah sandi benar) + kode TOTP/pemulihan dengan sesi.
// Tantangan berlaku 5 menit dan hanya 5 percobaan; setelah itu harus mulai dari sandi lagi.
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mfaChallenges, users, loginAttempts } from "@/lib/db/schema";
import { createSession, SIM_MULTI_SESSION } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api/respond";
import { consumeMfaCode, sessionUserPayload } from "@/lib/auth/mfa";
import { logAudit } from "@/lib/audit";

const bodySchema = z.object({ challenge: z.string().min(16).max(200), code: z.string().trim().min(6).max(16) });
const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const { challenge, code } = bodySchema.parse(await req.json());
    const tokenHash = createHash("sha256").update(challenge).digest("hex");
    const [ch] = await db.select().from(mfaChallenges).where(eq(mfaChallenges.tokenHash, tokenHash)).limit(1);
    const expired = { error: "Sesi verifikasi kedaluwarsa. Masuk ulang dengan kata sandi." };
    if (!ch || ch.expiresAt < new Date()) return NextResponse.json(expired, { status: 401 });
    if (ch.attempts >= MAX_ATTEMPTS) {
      await db.delete(mfaChallenges).where(eq(mfaChallenges.id, ch.id));
      return NextResponse.json({ error: "Terlalu banyak kode salah. Masuk ulang dengan kata sandi." }, { status: 429 });
    }
    // Percobaan dihitung SEBELUM memeriksa kode, supaya permintaan paralel tidak melewati batas.
    await db.update(mfaChallenges).set({ attempts: ch.attempts + 1 }).where(eq(mfaChallenges.id, ch.id));

    const [user] = await db.select().from(users).where(eq(users.id, ch.userId)).limit(1);
    if (!user || !user.mfaEnabled) return NextResponse.json(expired, { status: 401 });

    const via = await consumeMfaCode(user, code);
    if (!via) {
      await logAudit(req, { id: user.id, name: user.name, email: user.email }, "mfa.gagal");
      await db.insert(loginAttempts).values({ email: `mfa:${user.email.toLowerCase()}`, success: false, ipAddress: req.headers.get("x-forwarded-for") });
      return NextResponse.json({ error: "Kode tidak valid." }, { status: 401 });
    }

    await db.delete(mfaChallenges).where(eq(mfaChallenges.id, ch.id));
    await logAudit(req, { id: user.id, name: user.name, email: user.email }, "login.berhasil", { location: user.location, detail: { mfa: via } });
    if (via === "recovery") {
      await logAudit(req, { id: user.id, name: user.name, email: user.email }, "mfa.kode_pemulihan_dipakai", { targetType: "user", targetId: user.id, detail: { sisa: ((user.mfaRecoveryHashes as string[]) ?? []).length - 1 } });
    }
    const sessionToken = await createSession(user.id);
    return NextResponse.json({ ...sessionUserPayload(user), ...(SIM_MULTI_SESSION ? { simToken: sessionToken } : {}) });
  });
}
