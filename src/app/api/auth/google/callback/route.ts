// Step 2: Google redirects back here with ?code&state. On success this creates a
// session exactly the same way POST /api/auth/login does (see createSession in
// session.ts) — Google is only ever how the user proved who they are, not a
// separate identity system. A brand-new email gets a real `users` row auto-created
// with location=NULL, same as a self-registered password account (see
// /api/auth/register) — it still lands in the existing "pending Admin Regional
// activation" state, nothing about that flow is bypassed just because sign-in was
// via Google.
import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { exchangeGoogleCode } from "@/lib/auth/google";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

const STATE_COOKIE = "google_oauth_state";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expectedState = req.cookies.get(STATE_COOKIE)?.value;

  const fail = (reason: string) => {
    const res = NextResponse.redirect(`${req.nextUrl.origin}/login?googleError=${encodeURIComponent(reason)}`);
    res.cookies.delete(STATE_COOKIE);
    return res;
  };

  if (!code || !state || !expectedState || state !== expectedState) {
    return fail("Sesi login Google tidak valid. Silakan coba lagi.");
  }

  try {
    const redirectUri = `${req.nextUrl.origin}/api/auth/google/callback`;
    const googleUser = await exchangeGoogleCode(code, redirectUri);

    if (!googleUser.email || !googleUser.email_verified) {
      return fail("Email Google Anda belum terverifikasi.");
    }

    const normalizedEmail = googleUser.email.toLowerCase();
    let [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

    if (!user) {
      // Placeholder hash — this account can never log in with a password (the
      // random secret behind it is discarded immediately), only via Google. If the
      // same person later wants password login too, that needs a real "set a
      // password" flow, deliberately not built here to keep this pass scoped to
      // sign-in only.
      const unusablePassword = randomBytes(32).toString("hex");
      const passwordHash = await hashPassword(unusablePassword);
      const [created] = await db
        .insert(users)
        .values({
          name: googleUser.name || googleUser.email,
          email: normalizedEmail,
          passwordHash,
          role: "Penanggung Jawab PSI (Initiator)",
          location: null,
          isRegionalAdmin: false,
        })
        .returning();
      user = created;
    }

    await createSession(user.id);

    const res = NextResponse.redirect(`${req.nextUrl.origin}/`);
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch (err) {
    console.error("Google OAuth callback failed:", err);
    return fail("Gagal masuk dengan Google. Silakan coba lagi.");
  }
}
