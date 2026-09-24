// Mirrors register(name, email) from the client-only prototype's psiStore.tsx, with
// one addition: the user can now self-select a desired role + terminal at sign-up.
// Those are stored in users.requested_role / users.requested_location and surfaced as
// PREFILLED DEFAULTS on the Admin Regional's activation screen — never auto-applied,
// because granting access still requires an admin's approval (see CLAUDE.md's
// onboarding gate). The account itself is still created with role='Penanggung Jawab
// PSI (Initiator)' and location=NULL until that approval happens.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, locations } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api/respond";
import { passwordPolicyIssues } from "@/lib/domain/rules";

const ROLES = ["Penanggung Jawab PSI (Initiator)", "PSI / MOC Controller", "Admin Regional"] as const;

const bodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255),
  password: z.string().max(200),
  // Optional — pre-selected preferences only, never an authorization grant.
  role: z.enum(ROLES).optional(),
  location: z.string().trim().min(1).max(200).optional(),
});

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const { name, email, password, role, location } = bodySchema.parse(await req.json());

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
        passwordHash,
        role: "Penanggung Jawab PSI (Initiator)",
        location: null,
        isRegionalAdmin: false,
        requestedRole: role ?? null,
        requestedLocation,
      })
      .returning();

    await createSession(created.id);

    return NextResponse.json({
      id: created.id,
      name: created.name,
      email: created.email,
      role: created.role,
      location: created.location,
      isRegionalAdmin: created.isRegionalAdmin,
      requestedRole: created.requestedRole,
      requestedLocation: created.requestedLocation,
    });
  });
}
