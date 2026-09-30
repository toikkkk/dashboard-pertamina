"use client";

// Pemilih Lokasi bergaya modal-pencarian — sama pola dengan CategoryPickerField,
// dipakai di /upload dan form "Tautkan" Arsip Registry. Dulu <select> native
// dengan 29 lokasi berjejer tanpa cara mencari, sama beratnya ditelusuri seperti
// sub-kategori sebelum diperbaiki.
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X, Search, Check } from "lucide-react";

export default function LocationPickerField({
  locations,
  value,
  onChange,
  label = "Lokasi",
  disabled = false,
  required = false,
}: {
  locations: { locationName: string }[];
  value: string;
  onChange: (name: string) => void;
  label?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <div>
      <label className="block text-xs font-semibold text-[#3a3d40] mb-[5px]">
        {label} {required && <span className="text-[#DC2626]">*</span>}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="w-full min-h-[36px] px-3 py-1 text-[13px] border border-[#C5CED3] rounded-[8px] bg-white flex items-center justify-between text-left transition-colors duration-200 hover:border-[#9a9da0] disabled:cursor-not-allowed"
        style={{ background: disabled ? "#F8FAFC" : "#fff" }}
      >
        <span style={{ color: value ? "#0F172A" : "#9a9da0" }}>{value || "Pilih lokasi..."}</span>
        {!disabled && <ChevronDown className="w-[13px] h-[13px] text-[#9a9da0] flex-shrink-0" strokeWidth={2} />}
      </button>

      {open && !disabled && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 bg-[rgba(29,45,61,.5)] flex items-center justify-center z-[300] p-5 animate-backdropIn"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-[400px] max-w-full max-h-[80vh] bg-white rounded-[14px] flex flex-col animate-modalPop overflow-hidden">
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
                  placeholder="Cari lokasi..."
                  className="w-full min-h-[36px] pl-[32px] pr-3 py-1.5 text-[13px] border border-[#C5CED3] rounded-[8px]"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-[10px] pb-[14px]">
              {locations
                .filter((l) => l.locationName.toLowerCase().includes(search.trim().toLowerCase()))
                .map((l) => {
                  const sel = value === l.locationName;
                  return (
                    <button
                      key={l.locationName}
                      type="button"
                      onClick={() => { onChange(l.locationName); setOpen(false); setSearch(""); }}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-[8px] text-left hover:bg-[#F5F7F9] transition-colors duration-150"
                    >
                      <span className={`text-[13px] ${sel ? "font-bold text-[#0F3B59]" : "text-[#0F172A]"}`}>{l.locationName}</span>
                      {sel && <Check className="w-4 h-4 text-[#0F3B59] flex-shrink-0" strokeWidth={2.5} />}
                    </button>
                  );
                })}
              {locations.filter((l) => l.locationName.toLowerCase().includes(search.trim().toLowerCase())).length === 0 && (
                <p className="text-center text-[12.5px] text-[#9a9da0] py-8">Tidak ada lokasi yang cocok.</p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
