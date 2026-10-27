// Perlindungan CSRF untuk rute API: permintaan yang MENGUBAH data (POST/PUT/PATCH/DELETE) ditolak bila asalnya situs lain.
// Peramban selalu mengirim Origin dan Sec-Fetch-Site pada permintaan seperti ini, jadi formulir di situs lain tidak bisa
// memakai cookie sesi pengguna. Permintaan tanpa kedua header (skrip server-ke-server, alat uji) tetap diizinkan karena
// tidak membawa cookie dari peramban korban. Melengkapi SameSite=Lax pada cookie sesi.
import { NextRequest, NextResponse } from "next/server";

const CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function middleware(req: NextRequest) {
  if (!CHANGING.has(req.method)) return NextResponse.next();

  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return reject();

  const origin = req.headers.get("origin");
  if (origin && origin !== "null") {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      return reject();
    }
    const hosts = [req.headers.get("host"), req.headers.get("x-forwarded-host"), req.nextUrl.host].filter(Boolean) as string[];
    if (!hosts.includes(originHost)) return reject();
  } else if (origin === "null") {
    return reject(); // asal buram (mis. iframe bersandbox): tidak diizinkan mengubah data
  }
  return NextResponse.next();
}

function reject() {
  return NextResponse.json({ error: "Permintaan ditolak: asal permintaan tidak sah." }, { status: 403 });
}

export const config = { matcher: "/api/:path*" };
