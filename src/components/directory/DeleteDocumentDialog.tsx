"use client";

// Konfirmasi hapus dokumen. Tak terbalik: dokumen, riwayatnya, dan berkas di penyimpanan (bila tidak dipakai dokumen lain)
// hilang permanen — jadi harus mengetik NOMOR dokumen. Pencatatan ke Log Aktivitas dilakukan server.
import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

export default function DeleteDocumentDialog({
  documentId,
  title,
  number,
  onClose,
  onDeleted,
}: {
  documentId: string;
  title: string;
  number: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const match = typed.trim() === number;

  const submit = async () => {
    if (!match) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Gagal menghapus dokumen.");
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus dokumen.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0F172A]/40 px-4 animate-backdropIn" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div role="alertdialog" aria-modal="true" aria-label="Hapus dokumen" className="w-full max-w-[460px] rounded-[14px] bg-white overflow-hidden shadow-[0_24px_60px_-12px_rgba(15,23,42,.35)] animate-modalPop">
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-[#B91C1C] text-white">
          <h2 className="font-heading text-[15px] font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4" strokeWidth={2.2} /> Hapus dokumen</h2>
          <button onClick={onClose} disabled={busy} aria-label="Tutup" className="text-white/80 hover:text-white disabled:opacity-40"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-3">
          <p className="text-[13px] text-[#0F172A] leading-relaxed">
            Anda akan menghapus <strong>{title}</strong>. Dokumen beserta riwayatnya dan <strong>berkasnya di penyimpanan dihapus permanen</strong> (kecuali berkas yang masih dipakai data lain). Tindakan ini <strong>tidak dapat dibatalkan</strong>.
          </p>
          <div>
            <div className="text-[10.5px] font-bold tracking-[.05em] text-[#6b6e72] uppercase mb-1.5">Ketik nomor dokumen untuk konfirmasi</div>
            <p className="font-mono text-[12px] text-[#3a3d40] mb-1.5 select-all">{number}</p>
            <input
              autoFocus
              value={typed}
              disabled={busy}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              aria-label="Nomor dokumen"
              className="w-full min-h-[40px] px-3 text-[13px] font-mono border border-[#C5CED3] rounded-[8px] focus:outline-none focus:border-[#B91C1C]"
            />
          </div>
          {error && <p role="alert" className="text-[11.5px] font-semibold text-[#DC2626]">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#EEF2F4]">
          <button onClick={onClose} disabled={busy} className="px-4 py-2 text-[13px] font-bold text-[#0F3B59] rounded-full hover:bg-[#E2E8EB] disabled:opacity-50">Batal</button>
          <button onClick={submit} disabled={!match || busy} className="px-5 py-2 text-[13px] font-bold rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white disabled:opacity-40 transition-colors">
            {busy ? "Menghapus…" : "Hapus permanen"}
          </button>
        </div>
      </div>
    </div>
  );
}
