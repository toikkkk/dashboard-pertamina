"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMocItem } from "@/lib/useMoc";
import MocFormViewer from "@/components/MocFormViewer";
import type { MocFormKey } from "@/components/MocSheet";

// Halaman cetak/unduh formulir MoC untuk ditandatangani di luar web. Navbar & footer
// disembunyikan saat cetak. ?form=pengusulan|pemantauan|tinjauan memilih lampiran;
// ?print=1 langsung membuka dialog cetak (dipakai tombol "Unduh PDF").
function PrintContent({ id }: { id: string }) {
  const params = useSearchParams();
  const { moc, isLoading, error } = useMocItem(id);
  const formParam = params.get("form");
  const form: MocFormKey = formParam === "pemantauan" || formParam === "tinjauan" ? formParam : "pengusulan";

  if (isLoading || (!moc && !error)) return <div className="text-[13px] text-[#6b6e72]">Memuat…</div>;
  if (error || !moc) return <div className="text-[13px] text-[#DC2626]">MOC tidak ditemukan.</div>;

  return (
    <div>
      <style>{`
        @media print {
          /* header/footer menutup Topbar (<header className="topbar">) & footer
             halaman, tapi Sidebar itu <aside className="sidebar"> — bukan <header> —
             jadi harus ditutup terpisah, begitu juga overlay mobile-nya. Tanpa ini
             sidebar app tetap ikut kecetak di sebelah kiri lembar (ditemukan lewat
             screenshot pengguna langsung, 2026-09-30). Flex pada .app-shell membuat
             .main-shell otomatis mengisi lebar penuh begitu .sidebar disembunyikan,
             jadi tidak perlu mengubah display .app-shell itu sendiri. */
          /* .skip-link (aksesibilitas keyboard, "Lewati ke konten utama") tersembunyi
             secara visual lewat CSS khusus fokus, bukan display:none — jadi ikut
             tercetak (ditemukan lewat perbandingan render nyata via LibreOffice,
             2026-09-30). */
          header, footer, .sidebar, .sidebar-overlay, .skip-link { display: none !important; }
          /* Header/footer BAWAAN BROWSER (tanggal+judul di atas, URL+nomor halaman
             di bawah) dari dialog "Simpan sebagai PDF" — bukan konten kita, tapi
             tetap ikut tercetak selama @page punya margin fisik (ruang itulah yang
             dipakai Chrome untuk header/footer-nya sendiri). Diperbaiki dengan
             trik yang sudah dikenal luas: margin fisik @page dibuat 0 (jadi tidak
             ada "ruang header/footer" bagi Chrome untuk diisi), lalu margin visual
             yang kita mau (persis page setup asli xlsx, sama seperti versi Word)
             dipindah jadi padding di body. Hasil akhirnya sama persis secara
             visual, tapi header/footer bawaan browser tidak lagi punya tempat.
             Ditemukan lewat screenshot pengguna langsung, 2026-10-01. */
          body { background: #fff !important; padding: 0.75in 0.25in !important; }
          main { padding: 0 !important; }
          .no-print { display: none !important; }
          /* Kerangka aplikasi (latar abu-abu, kartu bayangan, padding lebar) tidak
             boleh ikut kecetak — hanya lembar formulirnya sendiri yang relevan. */
          .app-shell, .main-shell, .main-inner {
            background: #fff !important; box-shadow: none !important; border: 0 !important;
            border-radius: 0 !important; margin: 0 !important; padding: 0 !important; max-width: none !important;
          }
          /* Browser default MEMBUANG semua warna latar saat cetak kecuali diminta
             eksplisit — tanpa ini pita biru/abu-abu (.band/.gray/.fill) dan warna
             Tingkat Risiko di lembar MoC ikut hilang jadi putih polos. */
          .moc-sheet, .moc-sheet * {
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important;
          }
          /* Margin fisik @page SENGAJA 0 — lihat komentar body di atas. Margin
             visual yang persis page setup asli Form MoC 2025.xlsx (0.75in/0.25in)
             sekarang datang dari padding body, bukan dari sini. */
          @page { size: A4; margin: 0; }
        }
      `}</style>
      <div className="no-print mb-3">
        <Link href={`/moc/${moc.id}`} className="text-[12.5px] font-bold text-[#0F3B59] hover:underline">← Kembali ke detail</Link>
      </div>
      <div className="bg-white p-3 border border-[#C5CED3] rounded-[8px] print:border-0 print:p-0">
        <MocFormViewer moc={moc} initialForm={form} standalone autoPrint={params.get("print") === "1"} />
      </div>
    </div>
  );
}

export default function MocPrintPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="text-[13px] text-[#6b6e72]">Memuat…</div>}>
      <PrintContent id={params.id} />
    </Suspense>
  );
}
