// Penerbitan email verifikasi. Dipakai saat pendaftaran dan tombol "kirim ulang". Tidak pernah melempar galat ke
// pemanggil: kegagalan kirim (mis. domain pengirim belum diverifikasi di Resend) hanya dicatat, supaya pendaftaran
// tidak ikut gagal — user bisa meminta kirim ulang. Batas 3 email per jam per user.
import { createHash, randomBytes } from "crypto";
import { and, desc, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { emailVerificationTokens } from "@/lib/db/schema";
import { sendVerificationEmail } from "@/lib/email/sendVerificationEmail";

const TTL_HOURS = 24;
const MAX_PER_HOUR = 3;

/** Apakah akun yang belum terverifikasi emailnya boleh diaktifkan Admin? Dikendalikan saklar env. */
export const emailVerificationRequired = () => process.env.EMAIL_VERIFICATION_REQUIRED === "true";

export type IssueResult = "terkirim" | "dibatasi" | "gagal";

export async function issueVerificationEmail(origin: string, user: { id: string; name: string; email: string }): Promise<IssueResult> {
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(emailVerificationTokens)
      .where(and(eq(emailVerificationTokens.userId, user.id), gt(emailVerificationTokens.createdAt, since)));
    if (count >= MAX_PER_HOUR) return "dibatasi";

    const token = randomBytes(32).toString("hex");
    await db.insert(emailVerificationTokens).values({
      userId: user.id,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000),
    });
    await sendVerificationEmail({ to: user.email, name: user.name, verifyUrl: `${origin}/verifikasi-email?token=${token}`, expiresInHours: TTL_HOURS });
    return "terkirim";
  } catch (err) {
    console.error("[email-verifikasi] gagal mengirim:", err instanceof Error ? err.message : err);
    return "gagal";
  }
}

/**
 * Permintaan ganti email: token membawa email baru dan dikirim KE email baru (bukti kepemilikan). Email akun belum
 * berubah sampai tautannya dibuka. Permintaan lama yang belum dipakai dibatalkan. Hasil "gagal" bila pengiriman ditolak
 * (token dihapus), "dibatasi" bila melewati 3 permintaan per jam.
 */
export async function issueEmailChange(origin: string, user: { id: string; name: string }, newEmail: string): Promise<IssueResult> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(emailVerificationTokens)
    .where(and(eq(emailVerificationTokens.userId, user.id), gt(emailVerificationTokens.createdAt, since)));
  if (count >= MAX_PER_HOUR) return "dibatasi";

  const now = new Date();
  await db
    .update(emailVerificationTokens)
    .set({ usedAt: now })
    .where(and(eq(emailVerificationTokens.userId, user.id), isNull(emailVerificationTokens.usedAt), isNotNull(emailVerificationTokens.newEmail)));

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await db.insert(emailVerificationTokens).values({ userId: user.id, tokenHash, newEmail, expiresAt: new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000) });
  try {
    await sendVerificationEmail({ to: newEmail, name: user.name, verifyUrl: `${origin}/verifikasi-email?token=${token}`, expiresInHours: TTL_HOURS, purpose: "change" });
    return "terkirim";
  } catch (err) {
    console.error("[ganti-email] gagal mengirim:", err instanceof Error ? err.message : err);
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.tokenHash, tokenHash));
    return "gagal";
  }
}

/** Email baru yang menunggu konfirmasi (belum dipakai dan belum kedaluwarsa), atau null. */
export async function pendingEmailOf(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ newEmail: emailVerificationTokens.newEmail })
    .from(emailVerificationTokens)
    .where(and(eq(emailVerificationTokens.userId, userId), isNull(emailVerificationTokens.usedAt), isNotNull(emailVerificationTokens.newEmail), gt(emailVerificationTokens.expiresAt, new Date())))
    .orderBy(desc(emailVerificationTokens.createdAt))
    .limit(1);
  return row?.newEmail ?? null;
}
