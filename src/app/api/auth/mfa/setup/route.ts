// Langkah 1 mengaktifkan MFA: buat rahasia baru (disimpan terenkripsi, MFA BELUM aktif) dan kembalikan kode QR +
// kunci manual untuk aplikasi authenticator. Memanggil ulang membuat rahasia baru selama MFA belum aktif.
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api/respond";
import { encryptSecret, secretBoxConfigured } from "@/lib/auth/secretBox";
import { generateTotpSecret, otpauthUrl } from "@/lib/auth/totp";
import { MFA_ISSUER } from "@/lib/auth/mfa";

export async function POST() {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    if (user.mfaEnabled) return NextResponse.json({ error: "MFA sudah aktif. Nonaktifkan dulu bila ingin mengganti perangkat." }, { status: 409 });
    if (!secretBoxConfigured()) {
      return NextResponse.json({ error: "MFA belum dapat diaktifkan: kunci enkripsi server (MFA_ENCRYPTION_KEY) belum diatur." }, { status: 503 });
    }
    const secret = generateTotpSecret();
    await db.update(users).set({ mfaSecretEnc: encryptSecret(secret), updatedAt: new Date() }).where(eq(users.id, user.id));
    const url = otpauthUrl(user.email, secret, MFA_ISSUER);
    const qr = await QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: "#0F172A", light: "#FFFFFF" } });
    return NextResponse.json({ secret, otpauthUrl: url, qr });
  });
}
