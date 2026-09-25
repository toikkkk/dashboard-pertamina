"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// Konfirmasi tindakan berisiko (mis. hapus user). Pola sama dengan LogoutConfirm: fokus
// awal di "Batal", Escape/klik latar membatalkan, Tab berputar di dalam dialog, dirender
// lewat portal. `error` menampilkan penolakan dari server tanpa menutup dialog.
export default function ConfirmDialog({
  open,
  title,
  confirmLabel,
  busy = false,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
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
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-[380px] rounded-[14px] bg-white p-6 shadow-[0_24px_60px_-12px_rgba(15,23,42,.35)] animate-modalPop"
      >
        <h2 id="confirm-title" className="font-heading text-[18px] font-bold text-[#0F172A] leading-snug">{title}</h2>
        {error && <p role="alert" className="mt-3 rounded-[8px] bg-[#FEE2E2] px-3 py-2 text-[12px] font-semibold text-[#991B1B]">{error}</p>}
        <div className="mt-6 flex justify-end gap-2.5">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-[42px] px-5 rounded-[8px] border border-[#C5CED3] bg-white text-[13px] font-bold text-[#0F172A] hover:bg-[#F5F7F9] active:scale-[0.97] transition-all duration-150 disabled:opacity-60"
          >
            Batal
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="min-h-[42px] px-5 rounded-[8px] bg-[#DC2626] hover:bg-[#B91C1C] text-[13px] font-bold text-white active:scale-[0.97] transition-all duration-150 disabled:opacity-60"
          >
            {busy ? "Menghapus…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
