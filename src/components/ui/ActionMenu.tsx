"use client";

// Menu aksi "⋮" per baris (seperti Google Drive): tombol titik tiga + daftar mengambang. Daftar memakai posisi
// "fixed" dari kotak tombol (tidak terpotong tabel), menutup saat klik di luar / Esc / scroll, bisa dioperasikan
// dengan keyboard (↑ ↓ Enter Esc). Item `danger` berwarna merah; `divider` menyisipkan garis pemisah.
import React, { useEffect, useRef, useState } from "react";
import { MoreVertical, type LucideIcon } from "lucide-react";

export interface ActionMenuItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  danger?: boolean;
  /** Garis pemisah SEBELUM item ini. */
  divider?: boolean;
}

export default function ActionMenu({ items, ariaLabel }: { items: ActionMenuItem[]; ariaLabel: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; up: boolean } | null>(null);
  const [active, setActive] = useState(0);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = () => setOpen(false);
  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const up = window.innerHeight - r.bottom < items.length * 40 + 24;
    setPos({ left: Math.max(8, r.right - 200), top: up ? r.top : r.bottom, up });
    setActive(0);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !listRef.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        btnRef.current?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const it = items[active];
        if (it) {
          close();
          it.onClick();
        }
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open, items, active]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          open ? close() : openMenu();
        }}
        className={`p-1.5 rounded-full text-[#6b6e72] hover:bg-[#E2E8EB] hover:text-[#0F172A] transition-colors duration-150 ${open ? "bg-[#E2E8EB] text-[#0F172A]" : ""}`}
      >
        <MoreVertical className="w-4 h-4" strokeWidth={2} />
      </button>
      {open && pos && (
        <div
          ref={listRef}
          role="menu"
          aria-label={ariaLabel}
          style={{ position: "fixed", left: pos.left, width: 200, zIndex: 400, ...(pos.up ? { bottom: window.innerHeight - pos.top + 4 } : { top: pos.top + 4 }) }}
          className="rounded-[10px] border border-[#D8E1E4] bg-white shadow-[0_12px_32px_-8px_rgba(15,23,42,.3)] py-1 animate-fadeIn"
        >
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <React.Fragment key={it.label}>
                {it.divider && <div className="my-1 border-t border-[#EEF2F4]" />}
                <button
                  type="button"
                  role="menuitem"
                  onMouseEnter={() => setActive(i)}
                  onClick={(e) => {
                    e.stopPropagation();
                    close();
                    it.onClick();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12.5px] font-semibold ${i === active ? "bg-[#F0F4F6]" : ""} ${it.danger ? "text-[#DC2626]" : "text-[#0F172A]"}`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />}
                  {it.label}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </>
  );
}
