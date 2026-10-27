/** @type {import('next').NextConfig} */

// Kebijakan konten (CSP). Next.js memakai skrip/gaya sebaris, jadi 'unsafe-inline' masih diperlukan; nilai tambahnya
// ada pada pembatasan asal sumber (skrip hanya dari situs sendiri, bingkai/koneksi hanya ke R2, dll).
// Kebijakan berlaku penuh (diuji 9 halaman + dokumen + MOC di produksi: 0 pelanggaran). Untuk kembali ke mode
// laporan saja bila ada sumber yang terlewat, setel CSP_REPORT_ONLY=1 di Vercel lalu redeploy.
// Berkas dokumen disajikan lewat /api/files/.../download yang mengalihkan (302) ke R2, sehingga R2 harus diizinkan
// untuk <img> (pratinjau gambar), <embed> (pratinjau PDF, diatur object-src), fetch (pratinjau Excel), dan bingkai.
const R2 = "https://*.r2.cloudflarestorage.com";
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"),
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${R2}`,
  "font-src 'self' data:",
  `connect-src 'self' ${R2}`,
  `frame-src 'self' blob: ${R2}`,
  "worker-src 'self' blob:",
  `object-src 'self' ${R2}`,
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig = {
  async headers() {
    return [
      {
        // Applies to every route, including API routes — this app has no reason
        // to ever be framed by another site (clickjacking on the login/approve
        // buttons) or to have its JSON responses MIME-sniffed as something else.
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: process.env.CSP_REPORT_ONLY === "1" ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
