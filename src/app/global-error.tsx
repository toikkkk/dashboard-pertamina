"use client";

// Cadangan terakhir: dipakai bila kerangka utama (layout) sendiri yang gagal, sehingga tidak ada sidebar, gaya, atau
// font aplikasi yang bisa diandalkan. Karena itu semua gaya ditulis inline.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const btn = { minHeight: 40, padding: "0 20px", fontSize: 13, fontWeight: 700, borderRadius: 999, cursor: "pointer", fontFamily: "inherit" } as const;
  return (
    <html lang="id">
      <body style={{ margin: 0, background: "#CAD4DA", color: "#0F172A", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div role="alert" style={{ width: "100%", maxWidth: 460, background: "#fff", border: "1px solid #C5CED3", borderRadius: 14, padding: "32px 28px", textAlign: "center", boxShadow: "0 12px 32px -16px rgba(15,23,42,.25)" }}>
            <div style={{ width: 40, height: 3, borderRadius: 999, background: "#DC2626", margin: "0 auto 16px" }} />
            <h1 style={{ margin: 0, fontSize: 19 }}>Aplikasi belum bisa dimuat</h1>
            <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.6, color: "#3a3d40" }}>Periksa koneksi internet Anda, lalu muat ulang halaman.</p>
            <div style={{ marginTop: 24, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <button type="button" onClick={() => window.location.reload()} style={{ ...btn, background: "#0F3B59", color: "#fff", border: "none" }}>Muat ulang</button>
              <button type="button" onClick={() => reset()} style={{ ...btn, background: "#fff", color: "#0F3B59", border: "1px solid #C5CED3" }}>Coba lagi</button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
