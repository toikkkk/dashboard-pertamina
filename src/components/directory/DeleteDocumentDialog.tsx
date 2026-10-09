"use client";

// Konfirmasi pindah dokumen ke Sampah (satu atau banyak). TIDAK permanen: dokumen bisa dipulihkan dari halaman
// Sampah dan baru dihapus otomatis setelah TRASH_RETENTION_DAYS hari, jadi cukup konfirmasi biasa (tanpa mengetik
// nomor). Satu dokumen memakai DELETE /api/documents/[id]; banyak dokumen memakai aksi massal. Pencatatan ke Log
// Aktivitas dilakukan server.
import React, { useState } from "react";
import { Trash2, X } from "lucide-react";
import { TRASH_RETENTION_DAYS } from "@/lib/domain/trash";

export default function DeleteDocumentDialog({
  documentId,
  documentIds,
  title,
  onClose,
  onDeleted,
}: {
  /** Satu dokumen. */
  documentId?: string;
  /** Banyak dokumen (dipakai bila diisi; `title` lalu diabaikan untuk teks jumlah). */
  documentIds?: string[];
  title: string;
  /** Tidak lagi dipakai (konfirmasi ketik nomor dihapus); dipertahankan agar pemanggil lama tetap valid. */
  number?: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const ids = documentIds ?? (documentId ? [documentId] : []);
  const many = ids.length > 1;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partial, setPartial] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!many) {
        const res = await fetch(`/api/documents/${ids[0]}`, { method: "DELETE" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Gagal memindahkan dokumen ke Sampah.");
        onDeleted();
        return;
      }
      const res = await fetch("/api/documents/trash/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "trash", ids }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Gagal memindahkan dokumen ke Sampah.");
      if (body.failed > 0) {
        const first = (body.results as { ok: boolean; error?: string }[]).find((r) => !r.ok)?.error;
        setError(`${body.done} dokumen dipindahkan, ${body.failed} gagal${first ? `: ${first}` : "."}`);
        setPartial(body.done > 0);
        setBusy(false);
        return;
      }
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memindahkan dokumen ke Sampah.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0F172A]/40 px-4 animate-backdropIn" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) (partial ? onDeleted : onClose)(); }}>
      <div role="alertdialog" aria-modal="true" aria-label="Pindahkan ke Sampah" className="w-full max-w-[440px] rounded-[14px] bg-white overflow-hidden shadow-[0_24px_60px_-12px_rgba(15,23,42,.35)] animate-modalPop">
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-[#0F3B59] text-white">
          <h2 className="font-heading text-[15px] font-bold flex items-center gap-2"><Trash2 className="w-4 h-4" strokeWidth={2.2} /> Pindahkan ke Sampah</h2>
          <button onClick={partial ? onDeleted : onClose} disabled={busy} aria-label="Tutup" className="text-white/80 hover:text-white disabled:opacity-40"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-3">
          <p className="text-[13px] text-[#0F172A] leading-relaxed">
            {many ? <strong>{ids.length} dokumen</strong> : <strong>{title}</strong>} akan dipindahkan ke Sampah dan dihapus permanen otomatis setelah {TRASH_RETENTION_DAYS} hari. Sebelum itu dokumen bisa dipulihkan dari halaman Sampah.
          </p>
          {error && <p role="alert" className="text-[11.5px] font-semibold text-[#DC2626]">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#EEF2F4]">
          <button onClick={partial ? onDeleted : onClose} disabled={busy} className="px-4 py-2 text-[13px] font-bold text-[#0F3B59] rounded-full hover:bg-[#E2E8EB] disabled:opacity-50">{partial ? "Tutup" : "Batal"}</button>
          {!partial && (
            <button onClick={submit} disabled={busy} className="px-5 py-2 text-[13px] font-bold rounded-full bg-[#0F3B59] hover:bg-[#0B2C43] text-white disabled:opacity-50 transition-colors">
              {busy ? "Memindahkan…" : "Pindahkan ke Sampah"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
