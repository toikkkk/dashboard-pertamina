"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// Konfirmasi keluar: mencegah logout tak sengaja. Fokus awal di "Batal" (pilihan aman),
// Escape dan klik latar menutup, Tab berputar di dalam dialog. Dirender lewat portal ke
// <body> agar tidak terpengaruh overflow/z-index sidebar.
export default function LogoutConfirm({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "Tab") {
        const first = cancelRef.current;
        const last = confirmRef.current;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-[#0F172A]/40 px-4 animate-backdropIn"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        className="w-full max-w-[360px] rounded-[14px] bg-white p-6 shadow-[0_24px_60px_-12px_rgba(15,23,42,.35)] animate-modalPop"
      >
        <h2 id="logout-title" className="font-heading text-[19px] font-bold text-[#0F172A]">Keluar dari akun?</h2>
        <div className="mt-6 flex justify-end gap-2.5">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="min-h-[42px] px-5 rounded-[8px] border border-[#C5CED3] bg-white text-[13px] font-bold text-[#0F172A] hover:bg-[#F5F7F9] active:scale-[0.97] transition-all duration-150"
          >
            Batal
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="min-h-[42px] px-5 rounded-[8px] bg-[#0F3B59] hover:bg-[#0B2C43] text-[13px] font-bold text-white active:scale-[0.97] transition-all duration-150"
          >
            Ya, keluar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
