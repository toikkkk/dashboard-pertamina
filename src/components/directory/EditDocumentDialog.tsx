"use client";

// "Ubah data dokumen": judul, nomor, jenis PSI, tanggal terbit (tanggal berlaku dihitung ulang otomatis dari siklus
// tinjau sub-dokumen) dan penanda "tanggal sudah diverifikasi" untuk dokumen yang tanggalnya masih perkiraan.
// Berkas & versi TIDAK diubah di sini (pakai "Ganti berkas"). Hanya field yang berubah yang dikirim; server mencatat
// nilai lama → baru di Riwayat Proses dan Log Aktivitas.
import React, { useEffect, useState } from "react";
import { X, Pencil } from "lucide-react";
import type { DocumentItem } from "@/lib/mockData";
import { usePsi } from "@/lib/psiStore";

const PSI_TYPES = ["Informasi Bahan Berbahaya", "Informasi Teknologi Proses", "Informasi Peralatan", "Sistem Tata Kerja"] as const;

const cycleText = (months: number) => (months % 12 === 0 ? `${months / 12} tahun` : `${months} bulan`);
const addMonthsIso = (iso: string, months: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const addMonths = (iso: string, months: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

export default function EditDocumentDialog({
  documentId,
  cycleMonths = 60,
  onClose,
  onSaved,
}: {
  documentId: string;
  /** Siklus tinjau sub-dokumen (bulan) — untuk pratinjau tanggal berlaku. */
  cycleMonths?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const todayIso = new Date().toISOString().split("T")[0];
  const { activeUser } = usePsi();
  const isAdmin = !!activeUser.isRegionalAdmin;
  const [expiryManual, setExpiryManual] = useState<string | null>(null); // diisi bila Admin mengatur manual
  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [title, setTitle] = useState("");
  const [number, setNumber] = useState("");
  const [psiType, setPsiType] = useState<string>(PSI_TYPES[1]);
  const [issue, setIssue] = useState("");
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/documents/${documentId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: DocumentItem) => {
        if (!live) return;
        setDoc(d);
        setTitle(d.title);
        setNumber(d.documentNumber);
        setPsiType(d.psiType);
        setIssue(d.issueDate);
      })
      .catch(() => live && setLoadError(true));
    return () => {
      live = false;
    };
  }, [documentId]);

  const estimated = !!doc?.history.some((h) => (h.notes ?? "").includes("tanggal terbit perkiraan"));
  const dateChanged = !!doc && issue !== doc.issueDate;

  const changes: Record<string, unknown> = {};
  if (doc) {
    if (title.trim() !== doc.title) changes.title = title.trim();
    if (number.trim() !== doc.documentNumber) changes.documentNumber = number.trim();
    if (psiType !== doc.psiType) changes.psiType = psiType;
    if (dateChanged) changes.issueDate = issue;
    if (isAdmin && expiryManual !== null && expiryManual !== (dateChanged && issue ? addMonthsIso(issue, cycleMonths) : doc.expiryDate)) changes.expiryDate = expiryManual;
    if (estimated && verified) changes.dateVerified = true;
  }
  const nothing = Object.keys(changes).length === 0;

  const submit = async () => {
    if (!title.trim() || !number.trim()) return setError("Judul dan nomor dokumen wajib diisi.");
    if (!issue || issue > todayIso) return setError("Tanggal terbit tidak valid (tidak boleh di masa depan).");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((Array.isArray(body.issues) && body.issues[0]?.message) || body.error || "Gagal menyimpan perubahan.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan perubahan.");
      setBusy(false);
    }
  };

  const field = "w-full min-h-[40px] px-3 text-[13px] border border-[#C5CED3] rounded-[8px] bg-white focus:outline-none focus:border-[#0F3B59] disabled:opacity-60";
  const label = "text-[10.5px] font-bold tracking-[.05em] text-[#6b6e72] uppercase mb-1.5";

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0F172A]/40 px-4 animate-backdropIn" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Ubah data dokumen" className="w-full max-w-[540px] max-h-[90vh] flex flex-col rounded-[14px] bg-white overflow-hidden shadow-[0_24px_60px_-12px_rgba(15,23,42,.35)] animate-modalPop">
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-[#0F3B59] text-white">
          <h2 className="font-heading text-[15px] font-bold flex items-center gap-2"><Pencil className="w-4 h-4" strokeWidth={2} /> Ubah data dokumen</h2>
          <button onClick={onClose} disabled={busy} aria-label="Tutup" className="text-white/70 hover:text-white disabled:opacity-40"><X className="w-4 h-4" /></button>
        </div>

        {loadError ? (
          <p className="px-5 py-10 text-center text-[13px] text-[#DC2626]">Dokumen tidak dapat dimuat.</p>
        ) : !doc ? (
          <p className="px-5 py-10 text-center text-[13px] text-[#9a9da0]">Memuat…</p>
        ) : (
          <>
            <div className="px-5 py-4 overflow-y-auto flex flex-col gap-3.5">
              <div>
                <div className={label}>Judul</div>
                <input value={title} disabled={busy} maxLength={300} onChange={(e) => setTitle(e.target.value)} className={field} />
              </div>
              <div>
                <div className={label}>Nomor dokumen</div>
                <input value={number} disabled={busy} maxLength={100} onChange={(e) => setNumber(e.target.value)} className={`${field} font-mono`} />
              </div>
              <div>
                <div className={label}>Jenis PSI</div>
                <div role="radiogroup" aria-label="Jenis PSI" className="flex flex-wrap gap-1.5">
                  {PSI_TYPES.map((t) => (
                    <button key={t} type="button" role="radio" aria-checked={psiType === t} disabled={busy} onClick={() => setPsiType(t)}
                      className={`px-3 py-1.5 text-[12px] rounded-full border transition-colors duration-150 ${psiType === t ? "border-[#0F3B59] bg-[#E2E8EB] font-bold text-[#0B2C43]" : "border-[#C5CED3] bg-white text-[#3a3d40] hover:bg-[#F5F7F9]"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className={label}>Tanggal terbit</div>
                  <input
                    type="date"
                    value={issue}
                    max={todayIso}
                    disabled={busy}
                    onChange={(e) => { setIssue(e.target.value); if (estimated) setVerified(true); }}
                    className={field}
                  />
                </div>
                <div>
                  <div className={label}>Berlaku sampai</div>
                  {isAdmin ? (
                    <input
                      type="date"
                      value={expiryManual ?? (issue ? (dateChanged ? addMonthsIso(issue, cycleMonths) : doc?.expiryDate ?? "") : "")}
                      min={issue || undefined}
                      disabled={busy}
                      onChange={(e) => setExpiryManual(e.target.value || null)}
                      className={field}
                    />
                  ) : (
                    <div className={`${field} bg-[#F5F7F9] flex items-center text-[#3a3d40]`}>{issue ? addMonths(issue, cycleMonths) : "—"}</div>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-[#9a9da0] -mt-2">Tanggal berlaku dihitung otomatis: tanggal terbit + {cycleText(cycleMonths)} (siklus tinjau sub-dokumen ini).{isAdmin ? " Admin Regional dapat mengubahnya manual." : ""}</p>
              {estimated && (
                <label className="flex items-start gap-2.5 px-3 py-2.5 rounded-[8px] bg-[#FEF3C7] text-[12px] text-[#92400E] cursor-pointer">
                  <input type="checkbox" checked={verified} disabled={busy} onChange={(e) => setVerified(e.target.checked)} className="mt-0.5 accent-[#0F3B59]" />
                  <span><strong>Tanggal terbit dokumen ini masih perkiraan.</strong> Centang bila sudah Anda periksa dengan isi dokumen — label &ldquo;perkiraan&rdquo; akan dihapus.</span>
                </label>
              )}
              {error && <p role="alert" className="text-[11.5px] font-semibold text-[#DC2626]">{error}</p>}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#EEF2F4]">
              <button onClick={onClose} disabled={busy} className="px-4 py-2 text-[13px] font-bold text-[#0F3B59] rounded-full hover:bg-[#E2E8EB] disabled:opacity-50">Batal</button>
              <button onClick={submit} disabled={busy || nothing} className="px-5 py-2 text-[13px] font-bold rounded-full bg-[#0F3B59] hover:bg-[#0B2C43] text-white disabled:opacity-50 transition-colors">
                {busy ? "Menyimpan…" : "Simpan perubahan"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
