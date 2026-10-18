"use client";

// "Tandai digantikan": pilih dokumen pengganti (di lokasi yang sama; sub-dokumen yang sama ditampilkan lebih dulu).
// Versi lama tetap tersimpan sebagai riwayat tetapi tidak dihitung di kedaluwarsa dan evaluasi tahunan.
import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { usePsi } from "@/lib/psiStore";
import type { DocumentItem } from "@/lib/mockData";
import { isSupersededDoc } from "@/lib/domain/rules";

const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

export default function SupersedeDialog({ doc, onClose, onDone }: { doc: DocumentItem; onClose: () => void; onDone: () => void }) {
  const { allDocuments } = usePsi();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candidates = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return allDocuments
      .filter((d) => d.id !== doc.id && d.location === doc.location && !isSupersededDoc(d))
      .filter((d) => !needle || d.title.toLowerCase().includes(needle) || d.documentNumber.toLowerCase().includes(needle))
      .sort((a, b) => Number(b.categoryId === doc.categoryId) - Number(a.categoryId === doc.categoryId) || b.issueDate.localeCompare(a.issueDate))
      .slice(0, 60);
  }, [allDocuments, doc, q]);

  const submit = async () => {
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}/supersede`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ byDocumentId: picked }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Gagal menandai.");
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menandai.");
      setBusy(false);
    }
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 bg-[rgba(29,45,61,.5)] flex items-center justify-center z-[300] p-5" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="w-[640px] max-w-full max-h-[85vh] bg-white rounded-[14px] flex flex-col overflow-hidden">
        <div className="flex items-start justify-between px-[22px] pt-[20px] pb-3 border-b border-[#eceded]">
          <div className="min-w-0">
            <h3 className="font-heading text-[17px] font-bold text-[#0F172A]">Tandai digantikan</h3>
            <p className="text-[12px] text-[#6b6e72] mt-0.5 truncate">{doc.documentNumber} · {doc.title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="p-1.5 rounded-[8px] hover:bg-[#F5F7F9]"><X className="w-4 h-4 text-[#6b6e72]" strokeWidth={1.8} /></button>
        </div>
        <div className="px-[22px] pt-3">
          <div className="text-[12.5px] font-bold text-[#0F172A] mb-1.5">Digantikan oleh dokumen mana?</div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#9a9da0] absolute left-[11px] top-1/2 -translate-y-1/2" strokeWidth={1.8} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul atau nomor dokumen..." className="w-full min-h-[38px] pl-[34px] pr-3 text-[13px] border border-[#C5CED3] rounded-[8px]" />
          </div>
        </div>
        <div role="radiogroup" aria-label="Dokumen pengganti" className="flex-1 overflow-y-auto px-[22px] py-3 flex flex-col gap-1.5">
          {candidates.length === 0 ? (
            <p className="text-center text-[12.5px] text-[#9a9da0] py-8">Tidak ada dokumen lain di lokasi ini.</p>
          ) : (
            candidates.map((d) => {
              const on = picked === d.id;
              const same = d.categoryId === doc.categoryId;
              return (
                <button
                  key={d.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setPicked(d.id)}
                  className={`text-left rounded-[10px] border px-3 py-2 transition-colors ${on ? "border-[#0F3B59] bg-[#EEF3F6]" : "border-[#E2E8EB] hover:bg-[#F5F7F9]"}`}
                >
                  <div className="text-[13px] font-semibold text-[#0F172A]">{d.title}</div>
                  <div className="text-[11px] text-[#6b6e72]">
                    {d.documentNumber} · terbit {fmt(d.issueDate)}{same ? "" : ` · ${d.categoryName ?? "tanpa sub-dokumen"}`}
                  </div>
                </button>
              );
            })
          )}
        </div>
        {error && <p role="alert" className="px-[22px] text-[12.5px] font-semibold text-[#DC2626]">{error}</p>}
        <div className="flex items-center justify-end gap-3 px-[22px] py-3 border-t border-[#eceded]">
          <button type="button" onClick={onClose} disabled={busy} className="text-[13px] font-bold text-[#0F172A] hover:underline">Batal</button>
          <button type="button" onClick={submit} disabled={!picked || busy} className="px-5 py-2 rounded-full bg-[#0F3B59] hover:bg-[#0B2C43] text-white text-[13px] font-bold disabled:opacity-50">
            {busy ? "Menyimpan…" : "Tandai digantikan"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
