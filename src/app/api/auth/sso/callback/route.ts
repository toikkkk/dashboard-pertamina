// Langkah 2 SSO: periksa state, tukar kode, verifikasi id_token, lalu buat/ambil akun dan mulai sesi.
// Akun baru dibuat "menunggu aktivasi" (tanpa lokasi, tanpa akses) persis seperti pendaftaran/Google — SSO hanya
// membuktikan SIAPA orangnya; hak akses tetap ditetapkan Admin Regional. MFA lokal tidak diminta lagi di sini:
// penyedia identitas perusahaan yang bertanggung jawab atas faktor keduanya.
import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { createSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { uniqueUsername } from "@/lib/auth/username";
import { emailDomainAllowed, exchangeAndVerify, ssoConfig } from "@/lib/auth/sso";
import { logAudit } from "@/lib/audit";

const COOKIE = "sso_oidc";

export async function GET(req: NextRequest) {
  const fail = (reason: string) => {
    const res = NextResponse.redirect(`${req.nextUrl.origin}/login?googleError=${encodeURIComponent(reason)}`);
    res.cookies.delete({ name: COOKIE, path: "/api/auth/sso" });
    return res;
  };

  const cfg = ssoConfig();
  if (!cfg) return fail("Login perusahaan belum diaktifkan.");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  let saved: { state: string; nonce: string; verifier: string } | null = null;
  try {
    saved = JSON.parse(req.cookies.get(COOKIE)?.value ?? "null");
  } catch {
    saved = null;
  }
  if (req.nextUrl.searchParams.get("error")) return fail("Login perusahaan dibatalkan atau ditolak penyedia.");
  if (!code || !state || !saved || saved.state !== state) return fail("Sesi login perusahaan tidak valid. Silakan coba lagi.");

  try {
    const id = await exchangeAndVerify(cfg, code, `${req.nextUrl.origin}/api/auth/sso/callback`, saved.verifier, saved.nonce);

    let [user] = await db.select().from(users).where(eq(users.email, id.email)).limit(1);
    if (!user) {
      if (!emailDomainAllowed(id.email)) {
        await logAudit(req, { email: id.email }, "login.ditolak_domain", { detail: { via: "sso" } });
        return fail("Domain email Anda tidak diizinkan untuk mendaftar. Hubungi administrator.");
      }
      const [created] = await db
        .insert(users)
        .values({
          name: id.name,
          email: id.email,
          username: await uniqueUsername(id.email),
          // Tidak bisa masuk dengan sandi: rahasia acak dibuang segera (akun ini hanya lewat SSO sampai ada alur "atur sandi").
          passwordHash: await hashPassword(randomBytes(32).toString("hex")),
          role: "Penanggung Jawab PSI (Initiator)",
          location: null,
          isRegionalAdmin: false,
          emailVerifiedAt: new Date(),
        })
        .returning();
      user = created;
      await logAudit(req, { id: user.id, name: user.name, email: user.email }, "akun.daftar", { targetType: "user", targetId: user.id, detail: { via: "sso" } });
    } else if (!user.emailVerifiedAt) {
      await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, user.id));
    }

    await createSession(user.id);
    await logAudit(req, { id: user.id, name: user.name, email: user.email }, "login.berhasil", { location: user.location, detail: { via: "sso" } });
    const res = NextResponse.redirect(`${req.nextUrl.origin}/`);
    res.cookies.delete({ name: COOKIE, path: "/api/auth/sso" });
    return res;
  } catch (err) {
    console.error("[sso] callback gagal:", err instanceof Error ? err.message : err);
    await logAudit(req, null, "login.gagal", { detail: { via: "sso", alasan: err instanceof Error ? err.message.slice(0, 120) : "tak diketahui" } });
    return fail("Gagal masuk dengan akun perusahaan. Silakan coba lagi.");
  }
}
