// Publik: penyedia login mana yang aktif (untuk menampilkan tombol di halaman masuk). Tidak membuka rahasia apa pun.
import { NextResponse } from "next/server";
import { ssoConfig } from "@/lib/auth/sso";

export async function GET() {
  const sso = ssoConfig();
  return NextResponse.json({ sso: sso ? { label: sso.label } : null, google: !!process.env.GOOGLE_CLIENT_ID });
}
