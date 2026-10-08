"use client";

// Bilah alat Direktori: kotak cari + chip "Perlu tindakan" (dengan jumlahnya) dan, di
// level daftar lokasi, pengalih Per Lokasi / Matriks.
import React, { useState } from "react";
import { Search, X, LayoutGrid, Table2, AlertTriangle, Clock, History, FileX, FileSpreadsheet, type LucideIcon } from "lucide-react";
import { ACTION_META, type ActionKind } from "@/components/directory/ActionList";

const KINDS: ActionKind[] = ["kedaluwarsa", "segera", "stale", "kosong"];
const KIND_ICON: Record<ActionKind, LucideIcon> = { kedaluwarsa: AlertTriangle, segera: Clock, stale: History, kosong: FileX };

export default function DirectoryToolbar({
  query,
  onQuery,
  counts,
  active,
  onAction,
  tab,
  onTab,
  onExport,
}: {
  query: string;
  onQuery: (q: string) => void;
  counts: Record<ActionKind, number | null>;
  active: ActionKind | null;
  onAction: (k: ActionKind | null) => void;
  /** null = tidak tampil (level lokasi / sedang melihat hasil). */
  tab: "lokasi" | "matriks" | null;
  onTab: (t: "lokasi" | "matriks") => void;
  /** Ekspor Excel dari data yang sedang dilihat; tombol disembunyikan bila tidak diberikan. */
  onExport?: () => Promise<unknown>;
}) {
  const [exporting, setExporting] = useState(false);
  const runExport = async () => {
    if (!onExport || exporting) return;
    setExporting(true);
    try {
      await onExport();
    } finally {
      setExporting(false);
    }
  };
  return (
    <div className="mb-5 flex flex-col gap-3">
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-[520px]">
          <Search className="w-3.5 h-3.5 text-[#9a9da0] absolute left-[11px] top-1/2 -translate-y-1/2" strokeWidth={1.8} />
          <input
            type="text"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Cari dokumen, nomor, lokasi, atau sub-dokumen…"
            aria-label="Cari di Direktori"
            className="w-full min-h-[38px] pl-[34px] pr-8 py-1.5 text-[13px] border border-[#C5CED3] rounded-[8px] bg-white"
          />
          {query && (
            <button type="button" onClick={() => onQuery("")} aria-label="Hapus pencarian" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#9a9da0] hover:text-[#0F172A]">
              <X className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          )}
        </div>

        {onExport && (
          <button type="button" onClick={runExport} disabled={exporting} className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] font-bold px-3.5 py-2 rounded-full border border-[#C5CED3] bg-white text-[#0F3B59] hover:bg-[#E2E8EB] transition-colors duration-150 disabled:opacity-60">
            <FileSpreadsheet className="w-3.5 h-3.5" strokeWidth={2.2} /> {exporting ? "Menyiapkan…" : "Ekspor Excel"}
          </button>
        )}
        {tab && (
          <div role="radiogroup" aria-label="Tampilan" className="flex items-center gap-1 p-0.5 rounded-[8px] bg-[#F0F2F3] border border-[#E2E8EB]">
            {([
              ["lokasi", "Per Lokasi", LayoutGrid],
              ["matriks", "Matriks", Table2],
            ] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={tab === key}
                onClick={() => onTab(key)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-[11.5px] font-bold transition-colors duration-150 ${tab === key ? "bg-white text-[#0F3B59] shadow-[0_1px_2px_rgba(15,23,42,.08)]" : "text-[#6b6e72] hover:text-[#0F172A]"}`}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={2} /> {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Perlu tindakan">
        {KINDS.map((k) => {
          const meta = ACTION_META[k];
          const Icon = KIND_ICON[k];
          const on = active === k;
          const n = counts[k];
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => onAction(on ? null : k)}
              className={`inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full border text-[12.5px] font-semibold transition-all duration-150 active:scale-[0.97] ${
                on ? "border-[#0F3B59] bg-[#0F3B59] text-white shadow-[0_2px_6px_rgba(15,59,89,.25)]" : "border-[#C5CED3] bg-white text-[#0F172A] hover:bg-[#F0F4F6]"
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2.2} style={{ color: on ? "#fff" : meta.color }} />
              {meta.label}
              <span
                className={`min-w-[22px] px-1.5 py-[1px] rounded-full text-center font-mono tabular-nums text-[11px] ${on ? "bg-white/20 text-white" : "bg-[#EEF2F4] text-[#3a3d40]"}`}
              >
                {n ?? "…"}
              </span>
              {on && <X className="w-3.5 h-3.5 -ml-0.5" strokeWidth={2.4} aria-label="Hapus filter" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
