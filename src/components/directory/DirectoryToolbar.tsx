"use client";

// Bilah alat Direktori: kotak cari + chip "Perlu tindakan" (dengan jumlahnya) dan, di
// level daftar lokasi, pengalih Per Lokasi / Matriks.
import React from "react";
import { Search, X, LayoutGrid, Table2 } from "lucide-react";
import { ACTION_META, type ActionKind } from "@/components/directory/ActionList";

const KINDS: ActionKind[] = ["kedaluwarsa", "segera", "stale", "kosong"];

export default function DirectoryToolbar({
  query,
  onQuery,
  counts,
  active,
  onAction,
  tab,
  onTab,
}: {
  query: string;
  onQuery: (q: string) => void;
  counts: Record<ActionKind, number | null>;
  active: ActionKind | null;
  onAction: (k: ActionKind | null) => void;
  /** null = tidak tampil (level lokasi / sedang melihat hasil). */
  tab: "lokasi" | "matriks" | null;
  onTab: (t: "lokasi" | "matriks") => void;
}) {
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

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase mr-1">Perlu tindakan</span>
        {KINDS.map((k) => {
          const meta = ACTION_META[k];
          const on = active === k;
          const n = counts[k];
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => onAction(on ? null : k)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] border text-[12px] font-semibold transition-colors duration-150 ${on ? "border-[#0F3B59] bg-[#E2E8EB] text-[#0B2C43]" : "border-[#C5CED3] bg-white text-[#0F172A] hover:border-[#0F3B59]"}`}
            >
              <span className="w-2.5 h-[3px] rounded-full" style={{ background: meta.color }} aria-hidden />
              {meta.label}
              <span className="font-mono tabular-nums text-[11px] text-[#6b6e72]">{n ?? "…"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
