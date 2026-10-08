// Logika MFA di sisi server: memeriksa kode (TOTP atau kode pemulihan), mencatat langkah terpakai agar tidak
// bisa dipakai ulang, dan bentuk JSON user yang dikirim setelah masuk. Dipakai rute login/verify/disable.
import { and, eq, isNull, lt, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import type { SessionUser } from "@/lib/auth/session";
import { decryptSecret } from "@/lib/auth/secretBox";
import { hashRecoveryCode, looksLikeRecoveryCode, verifyTotp } from "@/lib/auth/totp";

export const MFA_ISSUER = "Portal PSI & MOC";

/** "totp" / "recovery" bila kode benar (dan langsung ditandai terpakai); null bila salah atau sudah dipakai. */
export async function consumeMfaCode(user: SessionUser, rawCode: string): Promise<"totp" | "recovery" | null> {
  const code = rawCode.trim();
  if (!user.mfaEnabled || !user.mfaSecretEnc || code.length === 0) return null;

  if (looksLikeRecoveryCode(code)) {
    const hash = hashRecoveryCode(code);
    const hashes = (user.mfaRecoveryHashes as string[]) ?? [];
    if (!hashes.includes(hash)) return null;
    // Hapus dengan syarat daftar masih memuat hash itu (cegah dua permintaan paralel memakai kode yang sama).
    const next = hashes.filter((h) => h !== hash);
    const updated = await db
      .update(users)
      .set({ mfaRecoveryHashes: next, updatedAt: new Date() })
      .where(and(eq(users.id, user.id), eq(users.mfaEnabled, true)))
      .returning({ id: users.id });
    return updated.length ? "recovery" : null;
  }

  const secret = decryptSecret(user.mfaSecretEnc);
  const step = verifyTotp(secret, code, { lastStep: user.mfaLastStep });
  if (step === null) return null;
  const updated = await db
    .update(users)
    .set({ mfaLastStep: step })
    .where(and(eq(users.id, user.id), or(isNull(users.mfaLastStep), lt(users.mfaLastStep, step))))
    .returning({ id: users.id });
  return updated.length ? "totp" : null;
}

/** Isi JSON user setelah masuk (tanpa kolom rahasia). Sama untuk login biasa dan setelah verifikasi MFA. */
export function sessionUserPayload(user: SessionUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role,
    location: user.location,
    isRegionalAdmin: user.isRegionalAdmin,
  };
}
