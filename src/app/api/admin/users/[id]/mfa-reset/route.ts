// Admin Regional mereset MFA seorang user (mis. ponselnya hilang dan kode pemulihan habis). User lalu masuk dengan
// sandi saja dan dapat mengaktifkan MFA lagi. Tercatat di Log Aktivitas. Tidak boleh mereset akun sendiri.
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, sessions } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertRegionalAdmin, ForbiddenError } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const admin = await requireSessionUser();
    assertRegionalAdmin(admin);
    if (params.id === admin.id) throw new ForbiddenError("Reset MFA akun sendiri lewat Pengaturan › Keamanan Akun.");

    const [target] = await db.select({ name: users.name, email: users.email, mfaEnabled: users.mfaEnabled }).from(users).where(eq(users.id, params.id)).limit(1);
    if (!target) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });

    await db
      .update(users)
      .set({ mfaEnabled: false, mfaSecretEnc: null, mfaEnabledAt: null, mfaRecoveryHashes: [], mfaLastStep: null, updatedAt: new Date() })
      .where(eq(users.id, params.id));
    // Sesi yang ada dicabut: bila perangkat hilang/dicuri, jangan biarkan sesinya hidup.
    await db.delete(sessions).where(eq(sessions.userId, params.id));
    await logAudit(req, { id: admin.id, name: admin.name, email: admin.email }, "mfa.direset_admin", { targetType: "user", targetId: params.id, targetLabel: `${target.name} <${target.email}>`, detail: { sebelumnyaAktif: target.mfaEnabled } });
    return NextResponse.json({ ok: true });
  });
}
