// TOTP (RFC 6238, HMAC-SHA1, 6 digit, langkah 30 dtk) — kompatibel dengan Google Authenticator, Microsoft
// Authenticator, Authy, dsb. Ditulis sendiri (tanpa dependensi) dan diuji dengan vektor uji RFC 6238.
import { createHmac, createHash, randomBytes, timingSafeEqual } from "crypto";

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const TOTP_STEP_SECONDS = 30;
const DIGITS = 6;

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of Array.from(buf)) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.replace(/=+$/, "").replace(/\s+/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) throw new Error("Karakter base32 tidak valid.");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20)); // 160 bit
}

export function hotp(secretBase32: string, counter: number, digits = DIGITS): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", base32Decode(secretBase32)).update(buf).digest();
  const off = h[h.length - 1] & 0x0f;
  const bin = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return (bin % 10 ** digits).toString().padStart(digits, "0");
}

export const currentStep = (nowMs = Date.now()) => Math.floor(nowMs / 1000 / TOTP_STEP_SECONDS);

/**
 * Memeriksa kode terhadap langkah sekarang ±1 (toleransi selisih jam). `lastStep` = langkah terakhir yang
 * sudah dipakai akun ini: langkah <= lastStep ditolak (kode yang sama tidak boleh dipakai dua kali).
 * Mengembalikan langkah yang cocok, atau null.
 */
export function verifyTotp(secretBase32: string, code: string, opts: { nowMs?: number; lastStep?: number | null } = {}): number | null {
  const clean = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return null;
  const step = currentStep(opts.nowMs);
  for (const s of [step, step - 1, step + 1]) {
    if (opts.lastStep != null && s <= opts.lastStep) continue;
    const expected = hotp(secretBase32, s);
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(clean))) return s;
  }
  return null;
}

export function otpauthUrl(accountLabel: string, secretBase32: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${accountLabel}`);
  return `otpauth://totp/${label}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${TOTP_STEP_SECONDS}`;
}

// Kode pemulihan: 8 kode sekali pakai, format XXXXX-XXXXX tanpa karakter yang mudah tertukar.
const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateRecoveryCodes(n = 8): string[] {
  return Array.from({ length: n }, () => {
    const bytes = randomBytes(10);
    const chars = Array.from(bytes, (b) => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length]).join("");
    return `${chars.slice(0, 5)}-${chars.slice(5)}`;
  });
}

export const normalizeRecoveryCode = (c: string) => c.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
export const hashRecoveryCode = (c: string) => createHash("sha256").update(normalizeRecoveryCode(c)).digest("hex");
export const looksLikeRecoveryCode = (c: string) => normalizeRecoveryCode(c).length === 10 && !/^\d{6}$/.test(c.replace(/\s+/g, ""));
