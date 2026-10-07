"use client";

// Daftar lokasi Direktori (Level 1): tiap kartu menunjukkan berapa dari 53 sub-dokumen
// Excel yang sudah terisi + bar progres, dan daftar bisa diurutkan dari yang paling
// lengkap / paling kurang. Bahasa visual sama dengan ubin sub-dokumen (kartu putih
// rounded-[14px], garis aksen kiri 3px).
import React, { useState } from "react";
import type { DirectoryOverview } from "@/lib/useDocumentCategories";

type SortMode = "nama" | "lengkap" | "kurang";
const SORTS: { key: SortMode; label: string }[] = [
  { key: "nama", label: "Nama" },
  { key: "lengkap", label: "Terlengkap" },
  { key: "kurang", label: "Paling kurang" },
];
const TYPE_ORDER = ["AFT", "FT", "IT", "Plant"];

function LocationCard({ name, docCount, filled, total, onSelect }: { name: string; docCount: number; filled: number; total: number; onSelect: () => void }) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  const active = filled > 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      className="relative overflow-hidden text-left p-3.5 pl-[18px] rounded-[14px] border border-[#D8E1E4] bg-white hover:border-[#0F3B59] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(15,59,89,.08)] transition-all duration-200 flex flex-col gap-2 min-h-[96px]"
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: active ? "#15803D" : "#E2E8EB" }} aria-hidden />
      <span className={`text-[13px] leading-snug ${active ? "font-bold text-[#0F172A]" : "font-semibold text-[#6b6e72]"}`}>{name}</span>
      <div className="mt-auto">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[10.5px] font-mono tabular-nums text-[#3a3d40]">
            <b className={active ? "text-[#0F172A]" : "text-[#9a9da0]"}>{filled}</b> dari {total} sub-dokumen
          </span>
          <span className="text-[10.5px] font-mono tabular-nums text-[#9a9da0]">{docCount} dok</span>
        </div>
        <div className="h-[4px] rounded-full bg-[#E9EEF1] overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${filled} dari ${total} sub-dokumen terisi`}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#0F3B59" }} />
        </div>
      </div>
    </button>
  );
}

export default function LocationOverview({ overview, onSelect, scope }: { overview: DirectoryOverview; onSelect: (loc: string) => void; scope: string[] | null }) {
  const [sort, setSort] = useState<SortMode>("nama");
  const [filter, setFilter] = useState("");

  const list = overview.locations.filter((l) => (!scope || scope.includes(l.name)) && l.name.toLowerCase().includes(filter.trim().toLowerCase()));
  const groups = new Map<string, typeof list>();
  for (const l of list) (groups.get(l.type) ?? groups.set(l.type, []).get(l.type)!).push(l);
  const ordered = Array.from(groups.entries()).sort((a, b) => TYPE_ORDER.indexOf(a[0]) - TYPE_ORDER.indexOf(b[0]));
  for (const [, items] of ordered) {
    items.sort((a, b) => {
      if (sort === "lengkap") return b.filled - a.filled || a.name.localeCompare(b.name);
      if (sort === "kurang") return a.filled - b.filled || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Cari lokasi..."
          aria-label="Cari lokasi"
          className="w-full max-w-[260px] min-h-[36px] px-3 py-1.5 text-[13px] border border-[#C5CED3] rounded-[8px]"
        />
        <div role="radiogroup" aria-label="Urutkan lokasi" className="flex items-center gap-1 p-0.5 rounded-[8px] bg-[#F0F2F3] border border-[#E2E8EB]">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              role="radio"
              aria-checked={sort === s.key}
              onClick={() => setSort(s.key)}
              className={`px-2.5 py-1.5 rounded-[6px] text-[11.5px] font-bold transition-colors duration-150 ${sort === s.key ? "bg-white text-[#0F3B59] shadow-[0_1px_2px_rgba(15,23,42,.08)]" : "text-[#6b6e72] hover:text-[#0F172A]"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {ordered.length === 0 ? (
        <p className="py-14 text-center text-[13px] text-[#9a9da0]">Tidak ada lokasi yang cocok.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {ordered.map(([type, items]) => (
            <section key={type}>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-[11px] font-bold tracking-[.05em] text-[#3a3d40] uppercase">{type}</span>
                <span className="text-[10.5px] font-mono text-[#9a9da0]">· {items.length} lokasi</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {items.map((l) => (
                  <LocationCard key={l.name} name={l.name} docCount={l.docCount} filled={l.filled} total={overview.total} onSelect={() => onSelect(l.name)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
