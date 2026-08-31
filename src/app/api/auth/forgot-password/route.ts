// Step 1 of password reset: always responds with the same generic message whether or
// not the email exists (same anti-enumeration principle as /api/auth/login's "Email
// atau kata sandi salah") — a caller must never be able to tell which emails are
// registered just by probing this endpoint.
import { randomBytes, createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { withErrorHandling } from "@/lib/api/respond";
import { sendPasswordResetEmail } from "@/lib/email/sendPasswordResetEmail";

const bodySchema = z.object({ email: z.string().trim().email().max(255) });

const TOKEN_TTL_MINUTES = 30;
const MAX_REQUESTS_PER_HOUR = 3;
const GENERIC_MESSAGE = "Kalau email tersebut terdaftar, tautan atur ulang kata sandi sudah dikirim.";

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const { email } = bodySchema.parse(await req.json());
    const normalizedEmail = email.toLowerCase();

    const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

    if (user) {
      // Cheap per-user throttle so this can't be used to spam someone's inbox.
      const windowStart = new Date(Date.now() - 60 * 60 * 1000);
      const [{ count: recentCount }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(passwordResetTokens)
        .where(and(eq(passwordResetTokens.userId, user.id), gt(passwordResetTokens.createdAt, windowStart)));

      if (recentCount < MAX_REQUESTS_PER_HOUR) {
        const token = randomBytes(32).toString("hex");
        const tokenHash = createHash("sha256").update(token).digest("hex");
        const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

        await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash, expiresAt });

        const resetUrl = `${req.nextUrl.origin}/reset-password?token=${token}`;
        try {
          await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl, expiresInMinutes: TOKEN_TTL_MINUTES });
        } catch (err) {
          // Logged for operator visibility only — the response to the caller stays
          // generic either way, so a delivery failure can't be used to fingerprint
          // which emails exist.
          console.error("Failed to send password reset email:", err);
        }
      }
    }

    return NextResponse.json({ message: GENERIC_MESSAGE });
  });
}
