"use client";

// Pemilih sub-dokumen: kolom cari + daftar bergrup per cluster Excel client (Sub Chapter A, B.1–B.5, Dokumen Lainnya).
// Dipakai dialog "Pindahkan" dan halaman "Dokumen Baru".
import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PSI_CHAPTERS } from "@/lib/domain/psiSubChapters";
import type { CategoryTile } from "@/lib/useDocumentCategories";

export default function CategoryPicker({
  categories,
  selectedId,
  onSelect,
  disabledId = null,
  disabledLabel = "saat ini",
  disabled = false,
  autoFocus = false,
  listClassName = "max-h-[340px]",
}: {
  categories: CategoryTile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabledId?: string | null;
  disabledLabel?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  listClassName?: string;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const groups = useMemo(() => {
    const match = (c: CategoryTile) => !q || c.name.toLowerCase().includes(q);
    const out: { key: string; title: string; items: CategoryTile[] }[] = PSI_CHAPTERS.map((ch) => ({
      key: ch.key,
      title: `${ch.label} · ${ch.title}`,
      items: categories.filter((c) => c.chapter === ch.key && match(c)),
    }));
    out.push({ key: "lain", title: "Dokumen Lainnya", items: categories.filter((c) => c.chapter === null && match(c)) });
    return out.filter((g) => g.items.length > 0);
  }, [categories, q]);

  return (
    <div>
      <div className="relative mb-2">
        <Search className="w-3.5 h-3.5 text-[#9a9da0] absolute left-[11px] top-1/2 -translate-y-1/2" strokeWidth={1.8} />
        <input
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari sub-dokumen…"
          aria-label="Cari sub-dokumen"
          className="w-full min-h-[38px] pl-[34px] pr-3 text-[13px] border border-[#C5CED3] rounded-[8px] bg-white focus:outline-none focus:border-[#0F3B59]"
        />
      </div>
      <div className={`overflow-y-auto ${listClassName}`} role="radiogroup" aria-label="Sub-dokumen">
        {groups.length === 0 && <p className="px-3 py-8 text-center text-[13px] text-[#9a9da0]">Tidak ada sub-dokumen yang cocok.</p>}
        {groups.map((g) => (
          <div key={g.key} className="mb-1">
            <div className="px-3 pt-2 pb-1 text-[10.5px] font-bold tracking-[.05em] uppercase text-[#9a9da0]">{g.title}</div>
            {g.items.map((c) => {
              const isDisabled = c.id === disabledId;
              const sel = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  disabled={isDisabled || disabled}
                  onClick={() => onSelect(c.id)}
                  className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-[8px] text-[13px] transition-colors duration-150 ${
                    sel ? "bg-[#E2E8EB] font-bold text-[#0B2C43]" : isDisabled ? "text-[#9a9da0] cursor-not-allowed" : "text-[#0F172A] hover:bg-[#F0F4F6]"
                  }`}
                >
                  {c.no != null && <span className="font-mono text-[#9a9da0] w-5 flex-shrink-0">{c.no}.</span>}
                  <span className="flex-1 min-w-0">{c.name}</span>
                  {isDisabled ? <span className="text-[11px] flex-shrink-0">{disabledLabel}</span> : <span className="font-mono text-[11px] text-[#6b6e72] flex-shrink-0">{c.documents.length}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
