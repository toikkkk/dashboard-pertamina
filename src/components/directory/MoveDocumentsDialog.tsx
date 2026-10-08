"use client";

// Dialog "Pindahkan ke…": pilih sub-dokumen tujuan (dikelompokkan per cluster Excel client) untuk satu
// atau banyak dokumen di lokasi yang sama. Hanya memindah antar sub-dokumen; tanggal terbit/berlaku tidak berubah.
import React, { useMemo, useState } from "react";
import { Search, X, FolderInput } from "lucide-react";
import { PSI_CHAPTERS } from "@/lib/domain/psiSubChapters";
import type { CategoryTile } from "@/lib/useDocumentCategories";

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
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

        <div className="px-5 pt-3 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#9a9da0] absolute left-[11px] top-1/2 -translate-y-1/2" strokeWidth={1.8} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari sub-dokumen…"
              aria-label="Cari sub-dokumen tujuan"
              className="w-full min-h-[38px] pl-[34px] pr-3 text-[13px] border border-[#C5CED3] rounded-[8px] bg-white focus:outline-none focus:border-[#0F3B59]"
            />
          </div>
        </div>

        <div className="overflow-y-auto min-h-0 flex-1 px-2 pb-2" role="radiogroup" aria-label="Sub-dokumen tujuan">
          {groups.length === 0 && <p className="px-3 py-8 text-center text-[13px] text-[#9a9da0]">Tidak ada sub-dokumen yang cocok.</p>}
          {groups.map((g) => (
            <div key={g.key} className="mb-1">
              <div className="px-3 pt-2 pb-1 text-[10.5px] font-bold tracking-[.05em] uppercase text-[#9a9da0]">{g.title}</div>
              {g.items.map((c) => {
                const current = c.id === currentCategoryId;
                const sel = c.id === target;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    disabled={current || busy}
                    onClick={() => setTarget(c.id)}
                    className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-[8px] text-[13px] transition-colors duration-150 ${
                      sel ? "bg-[#E2E8EB] font-bold text-[#0B2C43]" : current ? "text-[#9a9da0] cursor-not-allowed" : "text-[#0F172A] hover:bg-[#F0F4F6]"
                    }`}
                  >
                    {c.no != null && <span className="font-mono text-[#9a9da0] w-5 flex-shrink-0">{c.no}.</span>}
                    <span className="flex-1 min-w-0">{c.name}</span>
                    {current ? (
                      <span className="text-[11px] flex-shrink-0">saat ini</span>
                    ) : (
                      <span className="font-mono text-[11px] text-[#6b6e72] flex-shrink-0">{c.documents.length}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
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
