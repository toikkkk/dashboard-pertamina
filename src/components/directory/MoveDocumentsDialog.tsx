"use client";

// Dialog "Pindahkan ke…": pilih sub-dokumen tujuan (dikelompokkan per cluster Excel client) untuk satu
// atau banyak dokumen di lokasi yang sama. Hanya memindah antar sub-dokumen; tanggal terbit/berlaku tidak berubah.
import React, { useState } from "react";
import { X, FolderInput } from "lucide-react";
import type { CategoryTile } from "@/lib/useDocumentCategories";
import CategoryPicker from "@/components/directory/CategoryPicker";

export default function MoveDocumentsDialog({
  categories,
  ids,
  currentCategoryId,
  onClose,
  onMoved,
}: {
  categories: CategoryTile[];
  ids: string[];
  currentCategoryId: string | null;
  onClose: () => void;
  onMoved: (moved: number, categoryName: string) => void;
}) {
  const [target, setTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetName = categories.find((c) => c.id === target)?.name ?? null;

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/documents/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, categoryId: target }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Gagal memindahkan dokumen.");
      onMoved(body.moved ?? ids.length, body.categoryName ?? targetName ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memindahkan dokumen.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0F172A]/40 px-4 animate-backdropIn" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Pindahkan dokumen" className="w-full max-w-[520px] max-h-[86vh] flex flex-col rounded-[14px] bg-white overflow-hidden shadow-[0_24px_60px_-12px_rgba(15,23,42,.35)] animate-modalPop">
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-[#0F3B59] text-white">
          <div className="min-w-0">
            <h2 className="font-heading text-[15px] font-bold leading-snug flex items-center gap-2"><FolderInput className="w-4 h-4" strokeWidth={2} /> Pindahkan {ids.length} dokumen</h2>
            <div className="text-[11.5px] text-white/70">Pilih sub-dokumen tujuan</div>
          </div>
          <button onClick={onClose} disabled={busy} aria-label="Tutup" className="text-white/70 hover:text-white disabled:opacity-40"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 pt-3 pb-2 overflow-y-auto min-h-0 flex-1">
          <CategoryPicker categories={categories} selectedId={target} onSelect={setTarget} disabledId={currentCategoryId} disabled={busy} autoFocus listClassName="max-h-[52vh]" />
        </div>

        {error && <p role="alert" className="px-5 pb-2 text-[11.5px] font-semibold text-[#DC2626]">{error}</p>}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#EEF2F4]">
          <button onClick={onClose} disabled={busy} className="px-4 py-2 text-[13px] font-bold text-[#0F3B59] rounded-full hover:bg-[#E2E8EB] disabled:opacity-50">Batal</button>
          <button onClick={submit} disabled={!target || busy} className="px-5 py-2 text-[13px] font-bold rounded-full bg-[#0F3B59] hover:bg-[#0B2C43] text-white active:scale-[0.97] transition-all duration-200 disabled:opacity-50 max-w-[260px] truncate">
            {busy ? "Memindahkan…" : "Pindahkan"}
          </button>
        </div>
      </div>
    </div>
  );
}
