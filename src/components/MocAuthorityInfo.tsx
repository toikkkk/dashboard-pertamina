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
      {open && (
        <div className="mt-2 overflow-x-auto rounded-[10px] border border-[#D8E1E4] bg-white">
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
                <tr key={i} className="border-t border-[#EEF2F4] align-top">
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
      )}
    </div>
  );
}
