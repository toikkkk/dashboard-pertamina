// DB-backed opaque-token sessions, not stateless JWT. This is a deliberate choice,
// not a default: assignUserAccess() (PATCH /api/admin/users/:id) needs a role/
// location change to take effect on the affected user's very next request — the
// client-only prototype already had this requirement (see psiStore.tsx history).
// Re-reading the live `users` row on every request via session.userId gives that
// for free, plus trivial instant revocation on logout (just delete the row). Only
// sha256(token) is ever persisted — the raw token lives solely in the httpOnly
// cookie, so a DB read alone can never reconstruct a working session.
import { randomBytes, createHash } from "crypto";
import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sessions, users } from "@/lib/db/schema";
import { ForbiddenError, UnauthorizedError } from "./rbac";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "psi_session";
const TTL_DAYS = Number(process.env.SESSION_TTL_DAYS ?? "7");

export type SessionUser = typeof users.$inferSelect;

// ---------------------------------------------------------------------------
// SIMULASI SEMENTARA — multi-akun per tab. HANYA aktif bila
// NEXT_PUBLIC_SIM_MULTI_SESSION=true (diset di .env.local, TIDAK di Vercel). Normalnya
// sesi = satu cookie per browser, jadi login akun lain di tab lain menimpa akun
// pertama. Saat sakelar aktif, tiap tab menyimpan token sesinya sendiri
// (sessionStorage) dan mengirimnya lewat header x-sim-session; header itu didahulukan
// atas cookie. Cookie tetap diset (dipakai navigasi biasa/unduhan yang tak bisa
// membawa header). Untuk MENGEMBALIKAN perilaku asli: hapus/false-kan variabel itu.
// Lihat src/lib/simSession.ts untuk sisi klien.
// ---------------------------------------------------------------------------
export const SIM_MULTI_SESSION = process.env.NEXT_PUBLIC_SIM_MULTI_SESSION === "true";
const SIM_HEADER = "x-sim-session";

function currentToken(): { token: string | undefined; fromHeader: boolean } {
  if (SIM_MULTI_SESSION) {
    const h = headers().get(SIM_HEADER);
    if (h) return { token: h, fromHeader: true };
  }
  return { token: cookies().get(COOKIE_NAME)?.value, fromHeader: false };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt });

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const { token, fromHeader } = currentToken();
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  // Mode simulasi: logout dari tab yang memakai token header tidak boleh menghapus
  // cookie — cookie itu milik akun terakhir yang login di tab lain.
  if (!fromHeader) cookies().delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const { token } = currentToken();
  if (!token) return null;

  const tokenHash = hashToken(token);
  const rows = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  if (row.expiresAt < new Date()) {
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    return null;
  }

  // Not awaited — a last-seen touch shouldn't add latency to every authenticated
  // request, and losing an occasional touch on a crash is harmless.
  void db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.tokenHash, tokenHash));

  return row.user;
}

export async function requireSessionUser(opts: { allowMustChange?: boolean } = {}): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  // Akun dengan sandi awal tidak boleh memakai API apa pun selain ganti sandi/keluar sampai sandinya diganti.
  if (user.mustChangePassword && !opts.allowMustChange) throw new ForbiddenError("Anda wajib mengganti kata sandi awal lebih dulu.");
  return user;
}
