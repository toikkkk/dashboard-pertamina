// Mirrors register(name, email) from the client-only prototype's psiStore.tsx
// exactly: always created as "Penanggung Jawab PSI (Initiator)" with location=NULL
// (pending Admin Regional onboarding — see AuthGuard.tsx). The only real change is
// that a password is now actually hashed and checked, instead of collected and
// silently ignored.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api/respond";
import { passwordPolicyIssues } from "@/lib/domain/rules";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255),
  password: z.string().max(200),
});

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const { name, email, password } = bodySchema.parse(await req.json());

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
    });
  });
}
