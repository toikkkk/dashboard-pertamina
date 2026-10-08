// Enkripsi rahasia di database (AES-256-GCM): dipakai untuk rahasia MFA (TOTP) supaya pembacaan database
// saja tidak cukup untuk menghasilkan kode MFA. Kunci diturunkan (SHA-256) dari MFA_ENCRYPTION_KEY, atau
// SESSION_SECRET bila yang pertama tidak diset. MENGGANTI kunci membuat rahasia MFA lama tidak terbaca
// (user harus mengaktifkan ulang MFA, atau admin mereset) — jadi atur MFA_ENCRYPTION_KEY sekali dan simpan.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function rawKey(): string | null {
  const raw = process.env.MFA_ENCRYPTION_KEY ?? process.env.SESSION_SECRET;
  return raw && raw.length >= 16 ? raw : null;
}

export function secretBoxConfigured(): boolean {
  return rawKey() !== null;
}

function key(): Buffer {
  const raw = rawKey();
  if (!raw) throw new Error("MFA_ENCRYPTION_KEY (atau SESSION_SECRET, min. 16 karakter) belum diatur di server.");
  return createHash("sha256").update(raw).digest();
}

/** Hasil: "v1.<iv>.<tag>.<ciphertext>" (base64url). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(".");
}

export function decryptSecret(box: string): string {
  const [v, iv, tag, ct] = box.split(".");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("Format rahasia tidak dikenali.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
}
