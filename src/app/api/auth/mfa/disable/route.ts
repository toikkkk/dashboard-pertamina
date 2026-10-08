// Menonaktifkan MFA sendiri: butuh kata sandi DAN kode (TOTP/pemulihan) — sesi yang dicuri saja tidak cukup.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api/respond";
import { verifyPassword } from "@/lib/auth/password";
import { consumeMfaCode } from "@/lib/auth/mfa";
import { logAudit } from "@/lib/audit";

const bodySchema = z.object({ password: z.string().min(1).max(200), code: z.string().trim().min(6).max(16) });

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const { password, code } = bodySchema.parse(await req.json());
    if (!user.mfaEnabled) return NextResponse.json({ error: "MFA belum aktif." }, { status: 409 });
    if (!(await verifyPassword(password, user.passwordHash))) {
      await logAudit(req, { id: user.id, name: user.name, email: user.email }, "mfa.nonaktif_gagal", { detail: { alasan: "sandi salah" } });
      return NextResponse.json({ error: "Kata sandi salah." }, { status: 400 });
    }
    if (!(await consumeMfaCode(user, code))) {
      await logAudit(req, { id: user.id, name: user.name, email: user.email }, "mfa.nonaktif_gagal", { detail: { alasan: "kode salah" } });
      return NextResponse.json({ error: "Kode tidak valid." }, { status: 400 });
    }
    await db
      .update(users)
      .set({ mfaEnabled: false, mfaSecretEnc: null, mfaEnabledAt: null, mfaRecoveryHashes: [], mfaLastStep: null, updatedAt: new Date() })
      .where(eq(users.id, user.id));
    await logAudit(req, { id: user.id, name: user.name, email: user.email }, "mfa.dinonaktifkan", { targetType: "user", targetId: user.id });
    return NextResponse.json({ ok: true });
  });
}
