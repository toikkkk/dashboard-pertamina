// Langkah 2: user memasukkan kode 6 digit dari aplikasi authenticator. Bila benar, MFA aktif dan 8 kode
// pemulihan dibuat (ditampilkan SEKALI; di database hanya hash-nya).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api/respond";
import { decryptSecret } from "@/lib/auth/secretBox";
import { generateRecoveryCodes, hashRecoveryCode, verifyTotp } from "@/lib/auth/totp";
import { logAudit } from "@/lib/audit";

const bodySchema = z.object({ code: z.string().trim().min(6).max(12) });

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const { code } = bodySchema.parse(await req.json());
    if (user.mfaEnabled) return NextResponse.json({ error: "MFA sudah aktif." }, { status: 409 });
    if (!user.mfaSecretEnc) return NextResponse.json({ error: "Mulai dari langkah menyiapkan MFA dulu." }, { status: 400 });

    const step = verifyTotp(decryptSecret(user.mfaSecretEnc), code);
    if (step === null) return NextResponse.json({ error: "Kode tidak cocok. Pastikan jam ponsel akurat lalu coba kode terbaru." }, { status: 400 });

    const recoveryCodes = generateRecoveryCodes(8);
    await db
      .update(users)
      .set({ mfaEnabled: true, mfaEnabledAt: new Date(), mfaLastStep: step, mfaRecoveryHashes: recoveryCodes.map(hashRecoveryCode), updatedAt: new Date() })
      .where(eq(users.id, user.id));
    await logAudit(req, { id: user.id, name: user.name, email: user.email }, "mfa.diaktifkan", { targetType: "user", targetId: user.id });
    return NextResponse.json({ ok: true, recoveryCodes });
  });
}
