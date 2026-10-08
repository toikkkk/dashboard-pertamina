// Step 2 of password reset: exchanges a valid, unused, unexpired token for a new
// password. Also revokes every existing session for the user (see sessions.ts) —
// a password reset should force re-login everywhere, including on a device an
// attacker may have been using with the old password.
import { logAudit } from "@/lib/audit";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, passwordResetTokens, sessions } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { withErrorHandling } from "@/lib/api/respond";
import { passwordPolicyIssues } from "@/lib/domain/rules";

const bodySchema = z.object({
  token: z.string().trim().min(1),
  password: z.string().max(200),
});

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const { token, password } = bodySchema.parse(await req.json());

    const passwordIssues = passwordPolicyIssues(password);
    if (passwordIssues.length > 0) {
      return NextResponse.json(
        { error: "Input tidak valid.", issues: [{ message: `Kata sandi belum memenuhi syarat: ${passwordIssues.join(", ")}.` }] },
        { status: 400 }
      );
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const [resetRow] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash)).limit(1);

    if (!resetRow || resetRow.usedAt || resetRow.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Tautan atur ulang kata sandi tidak valid atau sudah kedaluwarsa. Minta tautan baru." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    await Promise.all([
      db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, resetRow.userId)),
      db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, resetRow.id)),
      db.delete(sessions).where(eq(sessions.userId, resetRow.userId)),
    ]);

    await logAudit(req, { id: resetRow.userId }, "sandi.diatur_ulang", { targetType: "user", targetId: resetRow.userId, detail: { sesiDicabut: true } });
    return NextResponse.json({ message: "Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru." });
  });
}
