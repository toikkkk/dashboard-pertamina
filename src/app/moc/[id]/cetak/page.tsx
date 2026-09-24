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
          header, footer { display: none !important; }
          body { background: #fff !important; }
          main { padding: 0 !important; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>
      <div className="no-print mb-3">
        <Link href={`/moc/${moc.id}`} className="text-[12.5px] font-bold text-[#0F3B59] hover:underline">← Kembali ke detail</Link>
        <p className="text-[11.5px] text-[#6b6e72] mt-1">
          “Unduh PDF” membuka dialog cetak — pilih <strong>Simpan sebagai PDF</strong>. Tandatangani di luar web, lalu unggah hasilnya di halaman detail.
        </p>
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
