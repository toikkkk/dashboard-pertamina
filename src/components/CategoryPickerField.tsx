"use client";

// Pemilih Sub-kategori Direktori bergaya modal-pencarian — dipakai di /upload dan
// form "Tautkan" Arsip Registry supaya keduanya konsisten (dulu masing-masing
// punya <select> native/gaya sendiri). Dulu <select> native browser polos dengan
// 33 opsi berjejer tanpa cara mencari, jadi berat ditelusuri (masukan UI).
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X, Search, Check } from "lucide-react";
import type { CategoryTile } from "@/lib/useDocumentCategories";

export default function CategoryPickerField({
  categories,
  value,
  onChange,
  label = "Sub-kategori Direktori",
  helperText,
}: {
  categories: CategoryTile[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  helperText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = categories.find((c) => c.id === value);

  return (
    <div>
      <label className="block text-xs font-semibold text-[#3a3d40] mb-[5px]">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full min-h-[36px] px-3 py-1 text-[13px] border border-[#C5CED3] rounded-[8px] bg-white flex items-center justify-between text-left transition-colors duration-200 hover:border-[#9a9da0]"
      >
        <span style={{ color: value ? "#0F172A" : "#9a9da0" }}>{selected ? selected.name : "Tidak ditentukan"}</span>
        <ChevronDown className="w-[13px] h-[13px] text-[#9a9da0] flex-shrink-0" strokeWidth={2} />
      </button>
      {helperText && <p className="mt-1 text-[10.5px] text-[#9a9da0]">{helperText}</p>}

      {open && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 bg-[rgba(29,45,61,.5)] flex items-center justify-center z-[300] p-5 animate-backdropIn"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-[440px] max-w-full max-h-[80vh] bg-white rounded-[14px] flex flex-col animate-modalPop overflow-hidden">
            <div className="flex items-center justify-between px-[22px] pt-[22px] pb-3">
              <h3 className="font-heading text-lg font-bold">Pilih {label}</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Tutup" className="p-1">
                <X className="w-4 h-4 text-[#6b6e72]" strokeWidth={1.8} />
              </button>
            </div>
            <div className="px-[22px] pb-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#9a9da0] absolute left-[11px] top-1/2 -translate-y-1/2" strokeWidth={1.8} />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari sub-kategori..."
                  className="w-full min-h-[36px] pl-[32px] pr-3 py-1.5 text-[13px] border border-[#C5CED3] rounded-[8px]"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-[10px] pb-[14px]">
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); setSearch(""); }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-[8px] text-left hover:bg-[#F5F7F9] transition-colors duration-150"
              >
                <span className={`text-[13px] ${value === "" ? "font-bold text-[#0F3B59]" : "text-[#6b6e72]"}`}>Tidak ditentukan</span>
                {value === "" && <Check className="w-4 h-4 text-[#0F3B59] flex-shrink-0" strokeWidth={2.5} />}
              </button>
              {categories
                .filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
                .map((c) => {
                  const sel = value === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { onChange(c.id); setOpen(false); setSearch(""); }}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-[8px] text-left hover:bg-[#F5F7F9] transition-colors duration-150"
                    >
                      <span className={`text-[13px] ${sel ? "font-bold text-[#0F3B59]" : "text-[#0F172A]"}`}>{c.name}</span>
                      {sel && <Check className="w-4 h-4 text-[#0F3B59] flex-shrink-0" strokeWidth={2.5} />}
                    </button>
                  );
                })}
              {categories.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase())).length === 0 && (
                <p className="text-center text-[12.5px] text-[#9a9da0] py-8">Tidak ada sub-kategori yang cocok.</p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
