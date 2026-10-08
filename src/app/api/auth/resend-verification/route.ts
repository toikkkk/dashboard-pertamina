// Kirim ulang email verifikasi untuk akun yang sedang masuk (maks. 3 per jam).
import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api/respond";
import { issueVerificationEmail } from "@/lib/auth/emailVerification";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    if (user.emailVerifiedAt) return NextResponse.json({ message: "Email Anda sudah terverifikasi." });
    const result = await issueVerificationEmail(req.nextUrl.origin, user);
    await logAudit(req, { id: user.id, name: user.name, email: user.email }, "email.verifikasi_dikirim", { detail: { hasil: result } });
    if (result === "dibatasi") return NextResponse.json({ error: "Terlalu sering meminta email verifikasi. Coba lagi dalam satu jam." }, { status: 429 });
    if (result === "gagal") return NextResponse.json({ error: "Email belum dapat dikirim saat ini. Hubungi administrator sistem." }, { status: 502 });
    return NextResponse.json({ message: `Email verifikasi dikirim ke ${user.email}. Berlaku 24 jam.` });
  });
}
