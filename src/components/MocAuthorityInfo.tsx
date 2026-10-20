"use client";

// Info kewenangan validasi (Tabel 3 TKO B13.3-07) yang bisa dibuka-tutup di langkah memilih Reviewer/Approver.
import React, { useState } from "react";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import { MOC_AUTHORITY_TABLE } from "@/lib/domain/moc";

export default function MocAuthorityInfo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#0F3B59] hover:underline"
      >
        <Info className="w-3.5 h-3.5" strokeWidth={2.2} />
        Kewenangan validasi (Tabel 3)
        {open ? <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.2} /> : <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.2} />}
      </button>
      {open && <AuthorityTable />}
    </div>
  );
}

// Tabel 3 Kewenangan Validasi MoC (TKO B13.3-07). `highlight` menandai baris peran yang sedang dipilih.
export function AuthorityTable({ highlight }: { highlight?: string }) {
  return (
    <div className="overflow-x-auto rounded-[10px] border border-[#D8E1E4] bg-white">
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr className="bg-[#F2F5F7] text-left">
            <th className="px-3 py-2 font-bold">Peran</th>
            <th className="px-3 py-2 font-bold">Scope MoC</th>
            <th className="px-3 py-2 font-bold">Lokasi</th>
            <th className="px-3 py-2 font-bold">Region / AP</th>
          </tr>
        </thead>
        <tbody>
          {MOC_AUTHORITY_TABLE.map((r, i) => (
            <tr key={i} className={`border-t border-[#EEF2F4] align-top ${highlight && r.role === highlight ? "bg-[#FEF9C3]" : ""}`}>
              <td className="px-3 py-2 font-semibold whitespace-nowrap">{r.role}</td>
              <td className="px-3 py-2 font-mono whitespace-nowrap">{r.scope}</td>
              <td className="px-3 py-2">{r.lokasi}</td>
              <td className="px-3 py-2">{r.region}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-2 border-t border-[#EEF2F4] text-[11px] text-[#6b6e72]">
        Scope mengacu pada 13 aktivitas / ruang lingkup perubahan; scope 13 (sistem / aplikasi / teknologi) menambah Fungsi IT sebagai Reviewer.
      </div>
    </div>
  );
}

// Ikon "i" di baris pemilihan Reviewer/Approver: tabel kewenangan muncul saat kursor diarahkan (atau fokus/ketuk) sebagai referensi.
export function AuthorityHint({ highlight }: { highlight: "MoC Reviewer" | "MoC Approver" }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label="Lihat tabel kewenangan validasi (Tabel 3)"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="p-1.5 rounded-full text-[#0F3B59] hover:bg-[#E2E8EB] transition-colors"
      >
        <Info className="w-4 h-4" strokeWidth={2.2} />
      </button>
      {open && (
        <div role="tooltip" className="absolute right-0 top-full z-50 pt-1.5 w-[min(640px,88vw)]">
          <div className="shadow-[0_12px_32px_-8px_rgba(15,23,42,.35)] rounded-[10px]">
            <AuthorityTable highlight={highlight} />
          </div>
        </div>
      )}
    </span>
  );
}
