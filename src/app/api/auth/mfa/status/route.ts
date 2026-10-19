// Status keamanan akun sendiri untuk halaman "Keamanan Akun". Tidak pernah mengirim rahasia/hash.
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api/respond";
import { secretBoxConfigured } from "@/lib/auth/secretBox";
import { isPlaceholderEmail } from "@/lib/domain/rules";

export async function GET() {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    return NextResponse.json({
      mfaEnabled: user.mfaEnabled,
      mfaEnabledAt: user.mfaEnabledAt,
      recoveryCodesLeft: ((user.mfaRecoveryHashes as string[]) ?? []).length,
      mfaAvailable: secretBoxConfigured(),
      emailVerified: !!user.emailVerifiedAt && !isPlaceholderEmail(user.email),
      email: user.email,
    });
  });
}
