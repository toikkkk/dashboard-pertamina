"use client";

// Matriks kepatuhan: 53 sub-dokumen Excel (baris, dikelompokkan per cluster) × lokasi
// (kolom). Tiap sel: ✅ berlaku, 🟡 kedaluwarsa/perlu tinjau, ● belum ada dokumen.
// Klik sel membuka sub-dokumen itu di lokasi tersebut; klik judul kolom membuka lokasinya.
import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { PSI_CHAPTERS } from "@/lib/domain/psiSubChapters";
import type { DirectoryOverview } from "@/lib/useDocumentCategories";

const TYPE_ORDER = ["AFT", "FT", "IT", "Plant"];

function Cell({ s, n, onClick, title }: { s: "ok" | "missing" | "expired" | "review"; n: number; onClick: () => void; title: string }) {
  return (
    <td className="p-0 text-center border-l border-[#EEF2F4]">
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-label={title}
        className="w-full h-[30px] flex items-center justify-center hover:bg-[#F0F4F6] transition-colors duration-100"
      >
        {s === "ok" ? (
          <CheckCircle2 className="w-[14px] h-[14px] text-[#15803D]" strokeWidth={2.2} />
        ) : s === "missing" ? (
          <span className="w-[6px] h-[6px] rounded-full bg-[#D5DDE2]" />
        ) : (
          <AlertTriangle className="w-[14px] h-[14px] text-[#B45309]" strokeWidth={2.2} />
        )}
        <span className="sr-only">{n} dokumen</span>
      </button>
    </td>
  );
}

export default function ComplianceMatrix({
  overview,
  scope,
  onOpen,
  onOpenLocation,
}: {
  overview: DirectoryOverview;
  scope: string[] | null;
  onOpen: (location: string, categoryId: string) => void;
  onOpenLocation: (location: string) => void;
}) {
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const cols = overview.locations
    .filter((l) => !scope || scope.includes(l.name))
    .sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || a.name.localeCompare(b.name));
  const toggle = (k: string) =>
    setClosed((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <div className="min-w-0 max-w-full">
      <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] text-[#3a3d40] mb-3">
        <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-[14px] h-[14px] text-[#15803D]" strokeWidth={2.2} /> Berlaku</span>
        <span className="inline-flex items-center gap-1.5"><AlertTriangle className="w-[14px] h-[14px] text-[#B45309]" strokeWidth={2.2} /> Kedaluwarsa / perlu ditinjau</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-[6px] h-[6px] rounded-full bg-[#D5DDE2]" /> Belum ada dokumen</span>
      </div>
      <div className="bg-white border border-[#D8E1E4] rounded-[14px] overflow-auto max-h-[72vh] max-w-full">
        <table className="border-collapse text-[12px]">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-30 bg-[#F8F9FA] text-left px-3 py-2 min-w-[280px] max-w-[280px] border-b border-[#D8E1E4] text-[10.5px] font-bold tracking-[.05em] uppercase text-[#6b6e72]">Sub-dokumen</th>
              {cols.map((c) => (
                <th key={c.name} className="sticky top-0 z-20 bg-[#F8F9FA] border-b border-l border-[#D8E1E4] p-0 w-[34px] min-w-[34px] align-bottom">
                  <button
                    type="button"
                    onClick={() => onOpenLocation(c.name)}
                    title={`Buka ${c.name}`}
                    className="w-full h-[128px] flex items-end justify-center pb-2 text-[11px] font-bold text-[#0F3B59] hover:text-[#0B2C43] hover:bg-[#EEF2F4]"
                  >
                    <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", whiteSpace: "nowrap" }}>{c.name}</span>
                  </button>
                </th>
              ))}
              <th className="sticky top-0 z-20 bg-[#F8F9FA] border-b border-l border-[#D8E1E4] px-2 text-[10.5px] font-bold tracking-[.05em] uppercase text-[#6b6e72]">Lokasi</th>
            </tr>
          </thead>
          <tbody>
            {PSI_CHAPTERS.map((ch) => {
              const items = overview.items.filter((i) => i.chapter === ch.key);
              const isClosed = closed.has(ch.key);
              return (
                <React.Fragment key={ch.key}>
                  <tr className="cursor-pointer bg-[#F2F5F7] hover:bg-[#EAEFF2]" onClick={() => toggle(ch.key)}>
                    <td colSpan={cols.length + 2} className="sticky left-0 px-3 py-2 border-b border-[#E2E8EB]">
                      <span className="inline-flex items-center gap-1.5 font-bold text-[#0F172A]">
                        {isClosed ? <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.2} /> : <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.2} />}
                        {ch.title}
                        <span className="font-mono font-normal text-[10.5px] text-[#9a9da0]">{ch.label} · {items.length}</span>
                      </span>
                    </td>
                  </tr>
                  {!isClosed &&
                    items.map((it) => {
                      let ok = 0;
                      return (
                        <tr key={it.name} className="border-b border-[#EEF2F4]">
                          <td className="sticky left-0 z-10 bg-white px-3 py-1 min-w-[280px] max-w-[280px] align-middle">
                            <div className="flex gap-1.5 leading-snug" title={it.name}>
                              <span className="font-mono text-[#9a9da0] flex-shrink-0">{it.no}.</span>
                              <span className="font-semibold text-[#0F172A] line-clamp-2">{it.name}</span>
                            </div>
                          </td>
                          {cols.map((c) => {
                            const cell = overview.cells[c.name]?.[it.name];
                            if (!cell) return <td key={c.name} className="border-l border-[#EEF2F4]" />;
                            if (cell.s === "ok") ok += 1;
                            return (
                              <Cell
                                key={c.name}
                                s={cell.s}
                                n={cell.n}
                                onClick={() => onOpen(c.name, cell.id)}
                                title={`${c.name} — ${it.name}: ${cell.n} dokumen`}
                              />
                            );
                          })}
                          <td className="px-2 text-center font-mono tabular-nums text-[11px] text-[#3a3d40] border-l border-[#EEF2F4]">{ok}/{cols.length}</td>
                        </tr>
                      );
                    })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
