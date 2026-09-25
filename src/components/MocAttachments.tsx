"use client";

import React, { useState } from "react";
import { Paperclip } from "lucide-react";
import { mocApi } from "@/lib/useMoc";
import { uploadFileToR2 } from "@/lib/uploadFile";
import type { MocRequest } from "@/lib/domain/moc";

// Lampiran gambar / PDF (opsional) untuk tahap Implementasi dst. Pemeriksaan keamanan
// yang SEBENARNYA dilakukan server saat unggah (daftar putih jenis, tanda-byte, pola
// skrip/makro); pemeriksaan di sini hanya agar pesan galat cepat muncul.
const ACCEPT = ".pdf,.jpg,.jpeg,.png";
const OK_EXT = /\.(pdf|jpe?g|png)$/i;
const MAX_BYTES = 20 * 1024 * 1024;

export default function MocAttachments({ moc, canAttach }: { moc: MocRequest; canAttach: boolean }) {
  const items = moc.evidence.filter((e) => e.slot === "lampiran");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canAttach && items.length === 0) return null;

  const onPick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (!OK_EXT.test(file.name)) throw new Error(`${file.name}: hanya gambar (JPG/PNG) atau PDF.`);
        if (file.size > MAX_BYTES) throw new Error(`${file.name}: ukuran maksimum 20MB.`);
        const fileId = await uploadFileToR2(file);
        await mocApi.attachEvidence(moc.id, { slot: "lampiran", fileId });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengunggah lampiran.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border border-[#D8E1E4] rounded-[12px] shadow-[0_2px_6px_rgba(15,23,42,.045)] p-5">
      <h2 className="text-[13.5px] font-bold text-[#0F172A] mb-3">Lampiran</h2>
      {items.length > 0 && (
        <ul className="flex flex-col gap-1.5 mb-3">
          {items.map((e) => (
            <li key={e.id} className="text-[12.5px] flex items-center gap-2 flex-wrap">
              <Paperclip className="w-3.5 h-3.5 text-[#6b6e72]" strokeWidth={2} />
              <a href={e.fileUrl} target="_blank" rel="noreferrer noopener" className="font-semibold text-[#0F3B59] hover:underline">{e.fileName ?? "Berkas"}</a>
              <span className="text-[#6b6e72]">{e.stage ?? ""} · {e.uploadedByName} · {e.uploadedAt}</span>
            </li>
          ))}
        </ul>
      )}
      {canAttach && (
        <label className="inline-flex items-center gap-2 px-3 py-2 text-[12.5px] font-semibold border border-dashed border-[#C5CED3] rounded-[8px] cursor-pointer hover:border-[#0F3B59] transition-colors">
          <Paperclip className="w-3.5 h-3.5" strokeWidth={2} />
          {busy ? "Mengunggah…" : "Tambah gambar / PDF (opsional)"}
          <input type="file" multiple accept={ACCEPT} className="hidden" disabled={busy} onChange={(e) => { void onPick(e.target.files); e.target.value = ""; }} />
        </label>
      )}
      {error && <p role="alert" className="text-[12px] font-semibold text-[#DC2626] mt-2">{error}</p>}
    </div>
  );
}
