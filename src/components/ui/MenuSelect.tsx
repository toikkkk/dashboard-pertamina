"use client";

// Pengganti <select> bawaan browser (yang tampilannya beda-beda tiap OS dan tak bisa dicari): tombol berisi
// pilihan saat ini + daftar mengambang. Daftar memakai posisi "fixed" dari kotak tombol supaya tidak terpotong
// tabel/kartu ber-overflow, otomatis menyediakan kolom cari bila opsinya banyak, dan bisa dipakai dengan
// keyboard (↑ ↓ Enter Esc).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export interface MenuOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export default function MenuSelect({
  value,
  options,
  onChange,
  ariaLabel,
  fullWidth = false,
  minWidth = 160,
  disabled = false,
}: {
  value: string;
  options: MenuOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  fullWidth?: boolean;
  minWidth?: number;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; up: boolean } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchable = options.length > 8;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const room = window.innerHeight - r.bottom;
    setPos({ left: r.left, top: room < 280 && r.top > room ? r.top : r.bottom, width: Math.max(r.width, minWidth), up: room < 280 && r.top > room });
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !listRef.current?.contains(t)) close();
    };
    const onScroll = (e: Event) => {
      if (listRef.current?.contains(e.target as Node)) return;
      close();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (v: string) => {
    onChange(v);
    close();
    btnRef.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (shown[active] && !shown[active].disabled) choose(shown[active].value);
    }
  };

  const current = options.find((o) => o.value === value);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKey}
        style={{ minWidth }}
        className={`${fullWidth ? "w-full" : ""} inline-flex items-center justify-between gap-2 px-3 py-1.5 text-[12.5px] font-semibold text-[#0F172A] border rounded-[8px] bg-white transition-colors duration-150 disabled:opacity-60 ${open ? "border-[#0F3B59]" : "border-[#C5CED3] hover:border-[#9a9da0]"}`}
      >
        <span className="truncate">{current?.label ?? "Pilih…"}</span>
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 text-[#6b6e72] transition-transform duration-150 ${open ? "rotate-180" : ""}`} strokeWidth={2.2} />
      </button>
      {open && pos && (
        <div
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          onKeyDown={onKey}
          style={{ position: "fixed", left: pos.left, width: pos.width, zIndex: 400, ...(pos.up ? { bottom: window.innerHeight - pos.top + 4 } : { top: pos.top + 4 }) }}
          className="rounded-[10px] border border-[#D8E1E4] bg-white shadow-[0_12px_32px_-8px_rgba(15,23,42,.3)] overflow-hidden animate-fadeIn"
        >
          {searchable && (
            <div className="relative p-2 border-b border-[#EEF2F4]">
              <Search className="w-3.5 h-3.5 text-[#9a9da0] absolute left-[18px] top-1/2 -translate-y-1/2" strokeWidth={1.8} />
              <input
                autoFocus
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                onKeyDown={onKey}
                placeholder="Cari…"
                aria-label="Cari pilihan"
                className="w-full min-h-[34px] pl-8 pr-2 text-[12.5px] border border-[#C5CED3] rounded-[8px] focus:outline-none focus:border-[#0F3B59]"
              />
            </div>
          )}
          <div className="max-h-[260px] overflow-y-auto py-1">
            {shown.length === 0 && <div className="px-3 py-4 text-center text-[12px] text-[#9a9da0]">Tidak ada yang cocok.</div>}
            {shown.map((o, i) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={o.value === value}
                data-i={i}
                onMouseEnter={() => setActive(i)}
                disabled={o.disabled}
                onClick={() => !o.disabled && choose(o.value)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[12.5px] ${o.disabled ? "text-[#c3c6c9] cursor-not-allowed" : i === active ? "bg-[#F0F4F6]" : ""} ${o.value === value ? "font-bold text-[#0B2C43]" : o.disabled ? "" : "text-[#0F172A]"}`}
              >
                <span className="flex-1 min-w-0">{o.label}</span>
                {o.value === value && <Check className="w-3.5 h-3.5 text-[#0F3B59] flex-shrink-0" strokeWidth={2.4} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
