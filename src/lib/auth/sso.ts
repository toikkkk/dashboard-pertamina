// Login perusahaan (SSO) lewat OpenID Connect standar — kompatibel dengan Microsoft Entra ID (Azure AD), Okta,
// Keycloak, dsb. Alur: authorization code + PKCE (S256), `state` & `nonce` di cookie httpOnly jangka pendek, tanda tangan
// id_token diverifikasi lewat JWKS penyedia (jose), `iss`/`aud`/`exp`/`nonce` diperiksa. AKTIF HANYA bila variabel
// lingkungan berikut diisi (tombol di halaman masuk muncul otomatis; bila kosong, tidak ada yang berubah):
//   OIDC_ISSUER           mis. https://login.microsoftonline.com/<TENANT_ID>/v2.0
//   OIDC_CLIENT_ID, OIDC_CLIENT_SECRET
//   OIDC_LABEL            teks tombol (default "Akun Pertamina")
//   OIDC_SCOPES           default "openid profile email"
//   SSO_ALLOWED_EMAIL_DOMAINS   daftar domain dipisah koma (mis. "pertamina.com,pertaminapatraniaga.com"):
//                         akun BARU hanya dibuat bila domain emailnya ada di daftar (juga berlaku untuk login Google).
// Redirect URI yang harus didaftarkan di penyedia: <origin>/api/auth/sso/callback
import { createRemoteJWKSet, jwtVerify } from "jose";

export interface SsoConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  label: string;
  scopes: string;
}

export function ssoConfig(): SsoConfig | null {
  const issuer = process.env.OIDC_ISSUER?.trim().replace(/\/+$/, "");
  const clientId = process.env.OIDC_CLIENT_ID?.trim();
  const clientSecret = process.env.OIDC_CLIENT_SECRET?.trim();
  if (!issuer || !clientId || !clientSecret) return null;
  // Penyedia produksi wajib HTTPS (localhost dikecualikan untuk pengembangan/uji).
  if (!/^https:\/\//.test(issuer) && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(issuer)) return null;
  return { issuer, clientId, clientSecret, label: process.env.OIDC_LABEL?.trim() || "Akun Pertamina", scopes: process.env.OIDC_SCOPES?.trim() || "openid profile email" };
}

/** Domain yang diizinkan membuat akun baru; daftar kosong = tidak dibatasi. */
export function emailDomainAllowed(email: string): boolean {
  const list = (process.env.SSO_ALLOWED_EMAIL_DOMAINS ?? "").split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
  if (list.length === 0) return true;
  const domain = email.toLowerCase().split("@")[1] ?? "";
  return list.includes(domain);
}

interface Discovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
}

let cache: { at: number; issuer: string; doc: Discovery } | null = null;

export async function discover(cfg: SsoConfig): Promise<Discovery> {
  if (cache && cache.issuer === cfg.issuer && Date.now() - cache.at < 3600_000) return cache.doc;
  const res = await fetch(`${cfg.issuer}/.well-known/openid-configuration`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Penemuan OIDC gagal (${res.status}).`);
  const doc = (await res.json()) as Discovery;
  if (!doc.authorization_endpoint || !doc.token_endpoint || !doc.jwks_uri) throw new Error("Dokumen penemuan OIDC tidak lengkap.");
  cache = { at: Date.now(), issuer: cfg.issuer, doc };
  return doc;
}

export interface SsoIdentity {
  email: string;
  name: string;
  subject: string;
}

/** Menukar kode dengan token lalu memverifikasi id_token (tanda tangan, iss, aud, exp, nonce). */
export async function exchangeAndVerify(cfg: SsoConfig, code: string, redirectUri: string, codeVerifier: string, nonce: string): Promise<SsoIdentity> {
  const d = await discover(cfg);
  const tokenRes = await fetch(d.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      code_verifier: codeVerifier,
    }),
    cache: "no-store",
  });
  if (!tokenRes.ok) throw new Error(`Penukaran kode ditolak penyedia (${tokenRes.status}).`);
  const tokens = (await tokenRes.json()) as { id_token?: string };
  if (!tokens.id_token) throw new Error("Penyedia tidak mengirim id_token.");

  const { payload } = await jwtVerify(tokens.id_token, createRemoteJWKSet(new URL(d.jwks_uri)), {
    issuer: d.issuer,
    audience: cfg.clientId,
    clockTolerance: 60,
  });
  if (payload.nonce !== nonce) throw new Error("Nonce tidak cocok.");

  const email = String(payload.email ?? payload.preferred_username ?? payload.upn ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Penyedia tidak mengirim alamat email yang valid.");
  return { email, name: String(payload.name ?? email), subject: String(payload.sub ?? "") };
}
