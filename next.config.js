/** @type {import('next').NextConfig} */

// Kebijakan konten (CSP). Next.js memakai skrip/gaya sebaris, jadi 'unsafe-inline' masih diperlukan; nilai tambahnya
// ada pada pembatasan asal sumber (skrip hanya dari situs sendiri, bingkai/koneksi hanya ke R2, dll).
// CSP_ENFORCE=1 memberlakukan kebijakan; selain itu hanya dilaporkan di konsol peramban (Report-Only) agar tidak
// memutus fitur bila ada sumber yang terlewat.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.r2.cloudflarestorage.com",
  "frame-src 'self' blob: https://*.r2.cloudflarestorage.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
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
          { key: process.env.CSP_ENFORCE === "1" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only", value: csp },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
