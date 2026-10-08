"use client";

// "Ganti berkas / versi baru" untuk satu dokumen: unggah berkas pengganti (progres byte nyata), versi naik
// (default: versi mayor berikutnya, bisa diubah), tanggal terbit versi baru dibaca otomatis dari berkas lalu
// dikoreksi user. Riwayat versi lama tetap ada di tab Riwayat dokumen (API /revise mencatat selisihnya).
import React, { useState } from "react";
import { X, Upload as UploadIcon, FileText, RefreshCw } from "lucide-react";
import { uploadFileToR2 } from "@/lib/uploadFile";
import { readDateSuggestion } from "@/lib/readFileDate";

function nextVersion(v: string): string {
  const m = v.match(/^(\d+)(?:\.(\d+))?$/);
  if (!m) return v + ".1";
  return `${Number(m[1]) + 1}.0`;
}

export default function ReplaceFileDialog({
  documentId,
  title,
  currentVersion,
  onClose,
  onDone,
}: {
  documentId: string;
  title: string;
  currentVersion: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const todayIso = new Date().toISOString().split("T")[0];
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState(nextVersion(currentVersion));
  const [date, setDate] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [notes, setNotes] = useState("");
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "upload" | "save">("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const busy = phase !== "idle";

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setDate("");
    setHint(null);
    setReading(true);
    const s = await readDateSuggestion(f).catch(() => null);
    setReading(false);
    if (s) {
      setDate(s.date);
      setHint(`${s.confidence === "pasti" ? "" : "Perkiraan — periksa. "}${s.source}`);
    } else setHint("Tanggal tidak terbaca otomatis — isi manual.");
  };

  const submit = async () => {
    if (!file) return setError("Pilih berkas pengganti dulu.");
    if (!version.trim()) return setError("Versi baru wajib diisi.");
    if (!date) return setError("Isi tanggal terbit versi baru.");
    if (date > todayIso) return setError("Tanggal terbit tidak boleh di masa depan.");
    setError(null);
    try {
      setPhase("upload");
      const fileId = await uploadFileToR2(file, { onProgress: setProgress });
      setPhase("save");
      const res = await fetch(`/api/documents/${documentId}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newVersion: version.trim(), newFileId: fileId, notes: notes.trim() || undefined, issueDate: date }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Gagal menyimpan versi baru.");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengganti berkas.");
      setPhase("idle");
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0F172A]/40 px-4 animate-backdropIn" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Ganti berkas" className="w-full max-w-[520px] max-h-[90vh] flex flex-col rounded-[14px] bg-white overflow-hidden shadow-[0_24px_60px_-12px_rgba(15,23,42,.35)] animate-modalPop">
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-[#0F3B59] text-white">
          <div className="min-w-0">
            <h2 className="font-heading text-[15px] font-bold leading-snug flex items-center gap-2"><RefreshCw className="w-4 h-4" strokeWidth={2} /> Ganti berkas / versi baru</h2>
            <div className="text-[11.5px] text-white/70 truncate">{title} · versi saat ini {currentVersion}</div>
          </div>
          <button onClick={onClose} disabled={busy} aria-label="Tutup" className="text-white/70 hover:text-white disabled:opacity-40 flex-shrink-0"><X className="w-4 h-4" /></button>
        </div>
        {busy && (
          <div className="h-[3px] bg-[#E2E8EB]">
            <div className="h-full bg-[#15803D] transition-all duration-200" style={{ width: `${phase === "save" ? 100 : Math.round(progress * 100)}%` }} />
          </div>
        )}

        <div className="px-5 py-4 overflow-y-auto flex flex-col gap-3">
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); if (!busy) void pick(e.dataTransfer.files[0]); }}
            className={`flex items-center gap-3 px-4 py-4 border-2 border-dashed rounded-[14px] cursor-pointer transition-colors duration-150 ${dragOver ? "border-[#0F3B59] bg-[#E2E8EB]" : "border-[#C5CED3] bg-[#F5F7F9] hover:border-[#0F3B59]"}`}
          >
            {file ? <FileText className="w-6 h-6 text-[#DC2626] flex-shrink-0" strokeWidth={1.6} /> : <UploadIcon className="w-6 h-6 text-[#0F3B59] flex-shrink-0" strokeWidth={1.6} />}
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-[#0F172A] truncate">{file ? file.name : "Seret berkas pengganti ke sini"}</div>
              <div className="text-[12px] text-[#6b6e72]">{file ? `${(file.size / 1048576).toFixed(1)} MB · klik untuk mengganti pilihan` : <>atau <span className="text-[#0F3B59] font-bold underline">pilih dari komputer</span></>}</div>
            </div>
            <input type="file" className="hidden" disabled={busy} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
          </label>

          <div className="grid grid-cols-[1fr_170px] gap-3">
            <div>
              <div className="text-[10.5px] font-bold tracking-[.05em] text-[#6b6e72] uppercase mb-1.5">Versi baru</div>
              <input value={version} disabled={busy} onChange={(e) => setVersion(e.target.value)} className="w-full min-h-[38px] px-3 text-[13px] border border-[#C5CED3] rounded-[8px] bg-white focus:outline-none focus:border-[#0F3B59] disabled:opacity-60" />
            </div>
            <div>
              <div className="text-[10.5px] font-bold tracking-[.05em] text-[#6b6e72] uppercase mb-1.5">Tanggal terbit</div>
              <input type="date" value={date} max={todayIso} disabled={busy} onChange={(e) => setDate(e.target.value)} className={`w-full min-h-[38px] px-3 text-[13px] border rounded-[8px] bg-white focus:outline-none focus:border-[#0F3B59] disabled:opacity-60 ${file && !date && !reading ? "border-[#B45309]" : "border-[#C5CED3]"}`} />
            </div>
          </div>
          {file && <p className="text-[11px] text-[#9a9da0] -mt-1">{reading ? "Membaca tanggal dari berkas…" : hint}</p>}

          <div>
            <div className="text-[10.5px] font-bold tracking-[.05em] text-[#6b6e72] uppercase mb-1.5">Catatan perubahan (opsional)</div>
            <input value={notes} disabled={busy} onChange={(e) => setNotes(e.target.value)} maxLength={300} className="w-full min-h-[38px] px-3 text-[13px] border border-[#C5CED3] rounded-[8px] bg-white focus:outline-none focus:border-[#0F3B59] disabled:opacity-60" />
          </div>
          {error && <p role="alert" className="text-[11.5px] font-semibold text-[#DC2626]">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#EEF2F4]">
          <button onClick={onClose} disabled={busy} className="px-4 py-2 text-[13px] font-bold text-[#0F3B59] rounded-full hover:bg-[#E2E8EB] disabled:opacity-50">Batal</button>
          <button onClick={submit} disabled={busy || !file || reading} className="px-5 py-2 text-[13px] font-bold rounded-full bg-[#0F3B59] hover:bg-[#0B2C43] text-white active:scale-[0.97] transition-all duration-200 disabled:opacity-50">
            {phase === "upload" ? `Mengunggah ${Math.round(progress * 100)}%` : phase === "save" ? "Menyimpan…" : "Simpan versi baru"}
          </button>
        </div>
      </div>
    </div>
  );
}
