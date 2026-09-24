"use client";

import React from "react";
import Link from "next/link";
import { useMocItem } from "@/lib/useMoc";
import MocSheet from "@/components/MocSheet";

// Lembar cetak Lampiran 5 untuk ditandatangani di luar web. Navbar & footer
// disembunyikan saat cetak; "Simpan sebagai PDF" dari dialog cetak browser.
export default function MocPrintPage({ params }: { params: { id: string } }) {
  const { moc, isLoading, error } = useMocItem(params.id);
  if (isLoading || (!moc && !error)) return <div className="text-[13px] text-[#6b6e72]">Memuat…</div>;
  if (error || !moc) return <div className="text-[13px] text-[#DC2626]">MOC tidak ditemukan.</div>;

  return (
    <div>
      <style>{`
        @media print {
          header, footer { display: none !important; }
          body { background: #fff !important; }
          main { padding: 0 !important; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>
      <div className="no-print flex items-center justify-between gap-3 flex-wrap mb-4">
        <Link href={`/moc/${moc.id}`} className="text-[12.5px] font-bold text-[#0F3B59] hover:underline">← Kembali ke detail</Link>
        <div className="flex items-center gap-3">
          <span className="text-[11.5px] text-[#6b6e72]">Pilih “Simpan sebagai PDF” di dialog cetak, tandatangani di luar web, lalu unggah hasilnya di halaman detail.</span>
          <button type="button" onClick={() => window.print()} className="px-4 py-1.5 rounded-full bg-[#0F3B59] hover:bg-[#0B2C43] text-white text-[12.5px] font-bold transition-colors">
            Cetak / Simpan PDF
          </button>
        </div>
      </div>
      <div className="bg-white p-3 border border-[#C5CED3] rounded-[8px] print:border-0 print:p-0 overflow-x-auto">
        <div style={{ minWidth: 860 }}>
          <MocSheet moc={moc} />
        </div>
      </div>
    </div>
  );
}
