// Step 1: redirect to Google's consent screen. The redirect_uri is derived from the
// request's own origin (not a separate env var) so this works unchanged on
// localhost and production — but it must still be registered verbatim as an
// "Authorized redirect URI" in the Google Cloud OAuth client for both, or Google
// rejects the request before the user ever sees the consent screen.
import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { buildGoogleAuthUrl } from "@/lib/auth/google";

const STATE_COOKIE = "google_oauth_state";

export async function GET(req: NextRequest) {
  const state = randomBytes(16).toString("hex");
  const redirectUri = `${req.nextUrl.origin}/api/auth/google/callback`;
  const authUrl = buildGoogleAuthUrl(redirectUri, state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes — plenty for a consent-screen round trip
  });
  return res;
}
