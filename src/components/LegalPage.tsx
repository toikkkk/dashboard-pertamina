import React from "react";
import Link from "next/link";

// Kerangka halaman hukum publik (/privasi, /ketentuan): bisa dibuka tanpa login, dipakai juga sebagai tautan di
// layar persetujuan Google. Server component murni, tanpa data pengguna.
export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#CAD4DA] px-4 py-10">
      <article className="max-w-[760px] mx-auto bg-white rounded-[14px] border border-[#C5CED3] p-6 sm:p-9">
        <div className="text-[10.5px] font-bold uppercase tracking-[.14em] text-[#6b7780]">PSIOneVision</div>
        <h1 className="font-heading text-[26px] font-bold text-[#0F172A] mt-1">{title}</h1>
        <p className="text-[12.5px] text-[#6b6e72] mt-1">Terakhir diperbarui: {updated}</p>
        <div className="mt-6 flex flex-col gap-5 text-[14px] leading-relaxed text-[#1f2933]">{children}</div>
        <div className="mt-8 pt-5 border-t border-[#EDF0F2] flex gap-4 text-[13px] font-semibold text-[#0F3B59]">
          <Link href="/privasi" className="hover:underline">Kebijakan Privasi</Link>
          <Link href="/ketentuan" className="hover:underline">Ketentuan Layanan</Link>
          <Link href="/login" className="hover:underline ml-auto">Kembali ke halaman masuk</Link>
        </div>
      </article>
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-heading text-[16px] font-bold text-[#0F3B59] mb-1.5">{heading}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}
