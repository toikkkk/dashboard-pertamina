// Mirrors register(name, email) from the client-only prototype's psiStore.tsx, with
// one addition: the user can now self-select a desired role + terminal at sign-up.
// Those are stored in users.requested_role / users.requested_location and surfaced as
// PREFILLED DEFAULTS on the Admin Regional's activation screen — never auto-applied,
// because granting access still requires an admin's approval (see CLAUDE.md's
// onboarding gate). The account itself is still created with role='Penanggung Jawab
// PSI (Initiator)' and location=NULL until that approval happens.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, gt, like, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, locations, loginAttempts } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { createSession, SIM_MULTI_SESSION } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api/respond";
import { passwordPolicyIssues } from "@/lib/domain/rules";
import { USERNAME_MESSAGE, USERNAME_RE, normalizeUsername, uniqueUsername } from "@/lib/auth/username";

const ROLES = ["Penanggung Jawab PSI (Initiator)", "PSI / MOC Controller", "Admin Regional"] as const;

const bodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255),
  // Opsional: bila kosong diturunkan dari email.
  username: z.string().trim().max(60).optional(),
  password: z.string().max(200),
  // Optional — pre-selected preferences only, never an authorization grant.
  role: z.enum(ROLES).optional(),
  location: z.string().trim().min(1).max(200).optional(),
});

// Register memakai tabel `loginAttempts` yang sama (kolomnya cukup generik untuk
// dipakai bersama, menghindari migrasi tabel baru), tapi dibatasi per ALAMAT IP,
// bukan per email seperti login: penyalahgunaan register itu bikin akun massal
// dengan email BEDA-BEDA tiap kali, jadi pembatasan per-email tidak menangkapnya.
// Baris pelacakannya ditandai dengan prefix "register-attempt:" pada kolom email
// supaya TIDAK PERNAH tercampur dengan baris percobaan login asli (kalau ikut
// terhitung, seseorang yang sering login sukses dari IP yang sama—mis. kantor
// bersama—bisa salah kena batas saat mencoba daftar). Sebelumnya register sama
// sekali tidak dibatasi (audit keamanan 2026-09-30).
const REGISTER_RATE_LIMIT_WINDOW_MINUTES = 60;
const REGISTER_RATE_LIMIT_MAX_ATTEMPTS = 5;
const REGISTER_TRACKING_PREFIX = "register-attempt:";

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const ipAddress = req.headers.get("x-forwarded-for");
    if (ipAddress) {
      const windowStart = new Date(Date.now() - REGISTER_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
      const [{ count: recentAttempts }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(loginAttempts)
        .where(
          and(
            eq(loginAttempts.ipAddress, ipAddress),
            like(loginAttempts.email, `${REGISTER_TRACKING_PREFIX}%`),
            gt(loginAttempts.createdAt, windowStart)
          )
        );
      if (recentAttempts >= REGISTER_RATE_LIMIT_MAX_ATTEMPTS) {
        return NextResponse.json(
          { error: `Terlalu banyak percobaan pendaftaran dari jaringan ini. Coba lagi setelah ${REGISTER_RATE_LIMIT_WINDOW_MINUTES} menit.` },
          { status: 429 }
        );
      }
    }

    const { name, email, username: usernameInput, password, role, location } = bodySchema.parse(await req.json());

    // Dicatat SEBELUM validasi lain (email dobel, password lemah, dst.) supaya
    // percobaan yang gagal pun tetap terhitung ke batas — itu justru pola yang
    // paling perlu ditangkap (mis. mengecek banyak email satu-satu).
    if (ipAddress) {
      await db.insert(loginAttempts).values({ email: `${REGISTER_TRACKING_PREFIX}${email.toLowerCase()}`, success: false, ipAddress });
    }

    // Applied after the base zod shape rather than as a `.refine()` on it — keeps
    // the multi-requirement message list simple instead of fighting zod's
    // refine-message typing, while still shaping the response exactly like a zod
    // validation error so the client's shared `issues[0].message` handling (see
    // psiStore.tsx's fetchJson) picks it up the same way either way.
    const passwordIssues = passwordPolicyIssues(password);
    if (passwordIssues.length > 0) {
      return NextResponse.json(
        { error: "Input tidak valid.", issues: [{ message: `Kata sandi belum memenuhi syarat: ${passwordIssues.join(", ")}.` }] },
        { status: 400 }
      );
    }

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (existing) {
      return NextResponse.json({ error: "Email ini sudah terdaftar. Silakan masuk." }, { status: 409 });
    }

    let username: string;
    if (usernameInput) {
      username = normalizeUsername(usernameInput);
      if (!USERNAME_RE.test(username)) {
        return NextResponse.json({ error: USERNAME_MESSAGE }, { status: 400 });
      }
      const [taken] = await db.select({ id: users.id }).from(users).where(sql`lower(${users.username}) = ${username}`).limit(1);
      if (taken) return NextResponse.json({ error: "Username ini sudah dipakai." }, { status: 409 });
    } else {
      username = await uniqueUsername(email);
    }

    // Validate the requested location against the real curated terminals if provided —
    // reject a bogus string rather than silently storing a foreign-key-orphan value.
    let requestedLocation: string | null = null;
    if (location) {
      const [loc] = await db.select({ name: locations.name }).from(locations).where(eq(locations.name, location)).limit(1);
      if (!loc) {
        return NextResponse.json({ error: "Lokasi terminal tidak valid." }, { status: 400 });
      }
      requestedLocation = loc.name;
    }

    const passwordHash = await hashPassword(password);
    const [created] = await db
      .insert(users)
      .values({
        name,
        email: email.toLowerCase(),
        username,
        passwordHash,
        role: "Penanggung Jawab PSI (Initiator)",
        location: null,
        isRegionalAdmin: false,
        requestedRole: role ?? null,
        requestedLocation,
      })
      .returning();

    const sessionToken = await createSession(created.id);

    return NextResponse.json({
      id: created.id,
      name: created.name,
      email: created.email,
      username: created.username,
      role: created.role,
      location: created.location,
      isRegionalAdmin: created.isRegionalAdmin,
      // SIMULASI SEMENTARA (lihat auth/session.ts): token per-tab, hanya bila sakelar aktif.
      ...(SIM_MULTI_SESSION ? { simToken: sessionToken } : {}),
      requestedRole: created.requestedRole,
      requestedLocation: created.requestedLocation,
    });
  });
}
