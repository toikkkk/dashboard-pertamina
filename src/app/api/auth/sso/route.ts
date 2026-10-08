// Langkah 1 SSO: siapkan state + nonce + PKCE, simpan di cookie httpOnly 10 menit, lalu arahkan ke penyedia identitas.
import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { discover, ssoConfig } from "@/lib/auth/sso";

const SSO_COOKIE = "sso_oidc";

export async function GET(req: NextRequest) {
  const cfg = ssoConfig();
  if (!cfg) return NextResponse.redirect(`${req.nextUrl.origin}/login?googleError=${encodeURIComponent("Login perusahaan belum diaktifkan.")}`);
  try {
    const d = await discover(cfg);
    const state = randomBytes(16).toString("hex");
    const nonce = randomBytes(16).toString("hex");
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const url = new URL(d.authorization_endpoint);
    url.search = new URLSearchParams({
      response_type: "code",
      client_id: cfg.clientId,
      redirect_uri: `${req.nextUrl.origin}/api/auth/sso/callback`,
      scope: cfg.scopes,
      state,
      nonce,
      code_challenge: challenge,
      code_challenge_method: "S256",
    }).toString();
    const res = NextResponse.redirect(url.toString());
    res.cookies.set(SSO_COOKIE, JSON.stringify({ state, nonce, verifier }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/sso",
      maxAge: 600,
    });
    return res;
  } catch (err) {
    console.error("[sso] gagal memulai:", err instanceof Error ? err.message : err);
    return NextResponse.redirect(`${req.nextUrl.origin}/login?googleError=${encodeURIComponent("Login perusahaan sedang tidak tersedia.")}`);
  }
}
