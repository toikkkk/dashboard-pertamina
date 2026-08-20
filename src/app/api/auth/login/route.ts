// The email lookup + password check that clean-minimal-sign-in.tsx used to do
// CLIENT-SIDE over the full `users` array (matching on email, never actually
// checking the password). That could never survive a real backend — password
// hashes must never be sent to an unauthenticated client — so this route is the
// one genuinely new piece of logic, not just a relocation of existing code.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api/respond";

const bodySchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const { email, password } = bodySchema.parse(await req.json());

    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    // Same generic message whether the email doesn't exist or the password is
    // wrong — don't leak which case it was.
    const invalid = () => NextResponse.json({ error: "Email atau kata sandi salah." }, { status: 401 });

    if (!user) return invalid();
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return invalid();

    await createSession(user.id);

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      location: user.location,
      isRegionalAdmin: user.isRegionalAdmin,
    });
  });
}
