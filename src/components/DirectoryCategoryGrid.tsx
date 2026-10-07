"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePsi } from "@/lib/psiStore";
import { useDocumentCategories, createDocumentCategory, type CategoryTile } from "@/lib/useDocumentCategories";
import { CATEGORY_STATUS_META } from "@/lib/domain/documentCategories";
import { PSI_CHAPTERS } from "@/lib/domain/psiSubChapters";
import Breadcrumb, { type Crumb } from "@/components/Breadcrumb";
import { uploadFileToR2 } from "@/lib/uploadFile";
import { readDateSuggestion } from "@/lib/readFileDate";
import { titleFromFilename } from "@/lib/domain/dateFromText";
import { PSIType } from "@/lib/mockData";
import { Plus, Upload as UploadIcon, X, FileText, FileSpreadsheet, CheckCircle2, AlertTriangle, Circle, ChevronRight, type LucideIcon } from "lucide-react";

const PSI_TYPES: PSIType[] = [
  "Informasi Bahan Berbahaya",
  "Informasi Teknologi Proses",
  "Informasi Peralatan",
  "Sistem Tata Kerja",
];

function fmtDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

// Ikon nyata (bukan emoji Unicode — renderingnya beda-beda tiap OS/font dan terasa
// murahan dibanding ikon lucide yang dipakai di seluruh aplikasi ini) untuk status
// ✅/❌/🟡 yang diminta client. "missing" sengaja BUKAN warna alarm merah — belum
// ada dokumen itu kondisi normal/awal, bukan galat, jadi dibuat netral abu-abu;
// merah dipakai hanya sekali ada masalah nyata. Ini juga yang membuat grid 33 ubin
// sebelumnya terlihat seperti "penuh galat" — hampir semua ubin memang masih kosong.
const STATUS_ICON: Record<CategoryTile["status"], LucideIcon> = {
  ok: CheckCircle2,
  missing: Circle,
  expired: AlertTriangle,
  review: AlertTriangle,
};
const STATUS_COLOR: Record<CategoryTile["status"], string> = {
  ok: "#15803D",
  missing: "#C5CED3",
  expired: "#B45309",
  review: "#B45309",
};

// Ubin satu sub-kategori: status + nama dokumen kalau ada. Klik untuk buka
// dokumennya (kalau ada) atau formulir unggah singkat (kalau belum). Garis kiri
// 3px berwarna status — bahasa visual yang sama dengan log riwayat dokumen —
// dipakai untuk dipindai sekilas, sementara teks label tetap netral (tinta biasa,
// bukan warna status) sesuai aturan desain "Presisi Korporat" di app ini.
function CategoryTileCard({ tile, onClick, onFiles }: { tile: CategoryTile; onClick: () => void; onFiles?: (files: File[]) => void }) {
  const [over, setOver] = useState(false);
  const meta = CATEGORY_STATUS_META[tile.status];
  const Icon = STATUS_ICON[tile.status];
  const color = STATUS_COLOR[tile.status];
  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={onFiles ? (e) => { e.preventDefault(); setOver(true); } : undefined}
      onDragLeave={onFiles ? () => setOver(false) : undefined}
      onDrop={onFiles ? (e) => { e.preventDefault(); setOver(false); const dropped = Array.from(e.dataTransfer.files); if (dropped.length) onFiles(dropped); } : undefined}
      className={`relative overflow-hidden text-left p-3.5 pl-[18px] rounded-[14px] border ${over ? "border-[#0F3B59] bg-[#E2E8EB]" : "border-[#D8E1E4] bg-white"} hover:border-[#0F3B59] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(15,59,89,.08)] transition-all duration-200 flex flex-col gap-2 min-h-[92px]`}
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: color }} aria-hidden />
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12.5px] font-bold text-[#0F172A] leading-snug">
          {tile.no != null && <span className="font-mono text-[#9a9da0] font-semibold mr-1.5">{tile.no}.</span>}
          {tile.name}
        </span>
        <Icon className="w-[15px] h-[15px] flex-shrink-0" strokeWidth={2} style={{ color }} />
      </div>
      {tile.document ? (
        <div className="mt-auto">
          <div className="text-[11px] text-[#3a3d40] font-semibold truncate">{tile.document.title}</div>
          <div className="text-[10.5px] font-mono text-[#9a9da0]">
            v{tile.document.version} · {fmtDate(tile.document.issueDate)}
            {tile.documents.length > 1 && <> · <span className="font-bold text-[#0F3B59]">+{tile.documents.length - 1} lainnya</span></>}
          </div>
        </div>
      ) : (
        <div className="mt-auto text-[11px] text-[#9a9da0]">{tile.keterangan === "N/A" ? "N/A" : meta.label}</div>
      )}
    </button>
  );
}

function AddCategoryTile({ location, onCreated }: { location: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createDocumentCategory(location, name.trim());
      setName("");
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat sub-kategori.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="p-3.5 rounded-[14px] border border-dashed border-[#C5CED3] bg-[#F8F9F9] hover:border-[#0F3B59] hover:bg-white transition-all duration-200 flex flex-col items-center justify-center gap-1.5 min-h-[92px] text-[#6b6e72] hover:text-[#0F3B59]"
      >
        <Plus className="w-5 h-5" strokeWidth={1.8} />
        <span className="text-[11.5px] font-semibold">Sub-kategori Baru</span>
      </button>
    );
  }

  return (
    <div className="p-3.5 rounded-[14px] border border-[#0F3B59] bg-white flex flex-col gap-2 min-h-[92px]">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Nama sub-kategori"
        maxLength={150}
        className="text-[12.5px] px-2.5 py-2 border border-[#C5CED3] rounded-[8px] bg-white w-full"
      />
      {error && <p role="alert" className="text-[11px] font-semibold text-[#DC2626]">{error}</p>}
      <div className="flex gap-2 mt-auto">
        <button type="button" disabled={busy} onClick={submit} className="flex-1 text-[11.5px] font-bold px-3 py-1.5 rounded-[8px] bg-[#0F3B59] hover:bg-[#0B2C43] text-white disabled:opacity-60">
          {busy ? "Menyimpan…" : "Simpan"}
        </button>
        <button type="button" disabled={busy} onClick={() => { setOpen(false); setName(""); setError(null); }} className="text-[11.5px] font-bold px-3 py-1.5 rounded-[8px] border border-[#C5CED3] bg-white">
          Batal
        </button>
      </div>
    </div>
  );
}

// Unggah banyak berkas sekaligus ke satu sub-dokumen. Judul diisi dari nama berkas, tanggal
// terbit dibaca otomatis dari isi dokumen (PDF/Excel) atau nama berkas — hanya SARAN: user
// wajib memeriksa/mengoreksi, dan berkas yang tanggalnya tak terbaca dibiarkan kosong
// (tidak ditebak dari tanggal salin berkas).
interface UploadRow {
  key: string;
  file: File;
  title: string;
  date: string;
  hint: string | null;
  reading: boolean;
  status: "idle" | "saving" | "done" | "error";
  error: string | null;
}

let rowSeq = 0;

function defaultPsiType(category: CategoryTile): PSIType {
  return category.chapter === "A" ? "Informasi Bahan Berbahaya" : "Informasi Teknologi Proses";
}

function UploadIntoCategoryPanel({
  location,
  category,
  initialFiles,
  onClose,
  onUploaded,
}: {
  location: string;
  category: CategoryTile;
  initialFiles: File[];
  onClose: () => void;
  onUploaded: () => void;
}) {
  const { addNewDocument } = usePsi();
  const todayIso = new Date().toISOString().split("T")[0];
  const [psiType, setPsiType] = useState<PSIType>(defaultPsiType(category));
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seeded = useRef(false);

  const patch = (key: string, p: Partial<UploadRow>) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...p } : r)));

  const addFiles = useCallback((files: File[]) => {
    const fresh: UploadRow[] = files.map((file) => ({
      key: `r${++rowSeq}`,
      file,
      title: titleFromFilename(file.name) || file.name,
      date: "",
      hint: null,
      reading: true,
      status: "idle",
      error: null,
    }));
    setRows((prev) => [...prev, ...fresh]);
    fresh.forEach(async (r) => {
      const s = await readDateSuggestion(r.file).catch(() => null);
      setRows((prev) =>
        prev.map((x) =>
          x.key !== r.key
            ? x
            : {
                ...x,
                reading: false,
                date: s && !x.date ? s.date : x.date,
                hint: s ? `${s.confidence === "pasti" ? "" : "Perkiraan — periksa. "}${s.source}` : "Tanggal tidak terbaca otomatis — isi manual.",
              }
        )
      );
    });
  }, []);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (initialFiles.length) addFiles(initialFiles);
  }, [initialFiles, addFiles]);

  const submit = async () => {
    const todo = rows.filter((r) => r.status !== "done");
    if (todo.length === 0) return;
    if (todo.some((r) => r.reading)) return setError("Tunggu sebentar, tanggal masih dibaca dari berkas.");
    const bad = todo.find((r) => !r.title.trim() || !r.date || r.date > todayIso);
    if (bad) {
      patch(bad.key, { error: !bad.title.trim() ? "Judul wajib diisi." : !bad.date ? "Isi tanggal terbit." : "Tanggal terbit tidak boleh di masa depan." });
      return setError("Lengkapi judul dan tanggal terbit semua berkas.");
    }
    setError(null);
    setBusy(true);
    const locationCode = location.replace(/[()]/g, "").replace(/^(FT|IT|AFT)\s+/i, "").toUpperCase().replace(/\s+/g, "");
    let okCount = 0;
    for (let i = 0; i < todo.length; i++) {
      const r = todo[i];
      patch(r.key, { status: "saving", error: null });
      try {
        // Kedaluwarsa = tanggal terbit + siklus tinjau sub-dokumen ini (5 tahun; OSCP 2 tahun).
        const expiry = new Date(`${r.date}T00:00:00`);
        expiry.setMonth(expiry.getMonth() + category.reviewCycleMonths);
        const expiryIso = `${expiry.getFullYear()}-${String(expiry.getMonth() + 1).padStart(2, "0")}-${String(expiry.getDate()).padStart(2, "0")}`;
        const fileId = await uploadFileToR2(r.file);
        await addNewDocument({
          documentNumber: `PSI-${locationCode}-${todayIso.slice(0, 4)}-${String(Date.now() + i).slice(-5)}`,
          title: r.title.trim(),
          psiType,
          location,
          lifecyclePhase: "Operasi",
          isCircular: false,
          routes: [],
          fileId,
          expiryDate: expiryIso,
          issueDate: r.date,
          categoryId: category.id,
        });
        patch(r.key, { status: "done" });
        okCount += 1;
      } catch (err) {
        patch(r.key, { status: "error", error: err instanceof Error ? err.message : "Gagal menyimpan dokumen." });
      }
    }
    setBusy(false);
    if (okCount === todo.length) onUploaded();
    else setError(`${okCount} dari ${todo.length} berkas tersimpan. Perbaiki yang gagal lalu simpan lagi.`);
  };

  const pending = rows.filter((r) => r.status !== "done").length;
  const doneCount = rows.length - pending;
  const close = () => (doneCount > 0 ? onUploaded() : onClose());
  const progress = rows.length ? Math.round((doneCount / rows.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0F172A]/40 px-4 animate-backdropIn" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) close(); }}>
      <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (!busy) addFiles(Array.from(e.dataTransfer.files)); }} className="w-full max-w-[600px] max-h-[88vh] flex flex-col rounded-[14px] bg-white overflow-hidden shadow-[0_24px_60px_-12px_rgba(15,23,42,.35)] animate-modalPop">
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-[#0F3B59] text-white">
          <div className="min-w-0">
            <h2 className="font-heading text-[15px] font-bold leading-snug">
              {rows.length === 0 ? "Unggah berkas" : busy ? `Mengunggah ${doneCount + 1} dari ${rows.length}…` : `Unggah ${rows.length} berkas`}
            </h2>
            <div className="text-[11.5px] text-white/70 truncate">ke {category.name}</div>
          </div>
          <button onClick={close} disabled={busy} aria-label="Tutup" className="text-white/70 hover:text-white disabled:opacity-40 flex-shrink-0"><X className="w-4 h-4" /></button>
        </div>
        {busy && <div className="h-[3px] bg-[#E2E8EB]"><div className="h-full bg-[#15803D] transition-all duration-300" style={{ width: `${progress}%` }} /></div>}

        <div className="overflow-y-auto min-h-0 flex-1">
          {rows.length === 0 ? (
            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); addFiles(Array.from(e.dataTransfer.files)); }}
              className={`m-5 flex flex-col items-center justify-center gap-2 py-12 text-center border-2 border-dashed rounded-[14px] cursor-pointer transition-colors duration-150 ${
                dragOver ? "border-[#0F3B59] bg-[#E2E8EB]" : "border-[#C5CED3] bg-[#F5F7F9] hover:border-[#0F3B59]"
              }`}
            >
              <UploadIcon className="w-8 h-8 text-[#0F3B59]" strokeWidth={1.5} />
              <span className="text-[14px] font-semibold text-[#0F172A]">Seret berkas ke sini</span>
              <span className="text-[12.5px] text-[#6b6e72]">atau <span className="text-[#0F3B59] font-bold underline">pilih dari komputer</span></span>
              <input type="file" multiple className="hidden" onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
            </label>
          ) : (
            <>
              <div className="px-5 pt-4 pb-2 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Tipe PSI">
                <span className="text-[11.5px] text-[#6b6e72] mr-1">Jenis PSI:</span>
                {PSI_TYPES.map((t) => {
                  const sel = psiType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={sel}
                      disabled={busy}
                      onClick={() => setPsiType(t)}
                      className={`px-3 py-1 text-[12px] rounded-full border transition-colors duration-150 ${
                        sel ? "border-[#0F3B59] bg-[#E2E8EB] font-bold text-[#0B2C43]" : "border-[#C5CED3] bg-white text-[#3a3d40] hover:bg-[#F5F7F9]"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
              <div className="px-5 pb-3">
                {rows.map((r) => {
                  const { Icon, color } = fileIconFor(r.file.name);
                  const locked = busy || r.status === "done";
                  return (
                    <div key={r.key} className="py-2.5 border-b border-[#EEF2F4] last:border-b-0">
                      <div className="flex items-center gap-3">
                        <Icon className="w-[22px] h-[22px] flex-shrink-0" strokeWidth={1.6} style={{ color }} />
                        <input
                          value={r.title}
                          disabled={locked}
                          onChange={(e) => patch(r.key, { title: e.target.value, error: null })}
                          aria-label="Judul dokumen"
                          className="flex-1 min-w-0 text-[13px] font-semibold text-[#0F172A] px-2 py-1.5 -mx-2 rounded-[8px] bg-transparent border border-transparent hover:border-[#C5CED3] focus:bg-white focus:border-[#0F3B59] focus:outline-none disabled:opacity-70"
                        />
                        <input
                          type="date"
                          value={r.date}
                          max={todayIso}
                          disabled={locked}
                          onChange={(e) => patch(r.key, { date: e.target.value, error: null })}
                          aria-label="Tanggal terbit"
                          className={`w-[138px] flex-shrink-0 text-[12.5px] px-2 py-1.5 rounded-[8px] border bg-white focus:outline-none focus:border-[#0F3B59] disabled:opacity-70 ${!r.date && !r.reading ? "border-[#B45309]" : "border-[#C5CED3]"}`}
                        />
                        <span className="w-4 flex-shrink-0 flex justify-center">
                          {r.status === "done" ? (
                            <CheckCircle2 className="w-4 h-4 text-[#15803D]" strokeWidth={2.2} aria-label="Tersimpan" />
                          ) : r.status === "saving" ? (
                            <span className="w-3.5 h-3.5 rounded-full border-2 border-[#C5CED3] border-t-[#0F3B59] animate-spin" aria-label="Menyimpan" />
                          ) : !busy ? (
                            <button type="button" aria-label={`Hapus ${r.file.name}`} onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))} className="text-[#9a9da0] hover:text-[#DC2626]"><X className="w-3.5 h-3.5" /></button>
                          ) : null}
                        </span>
                      </div>
                      <p className={`pl-[34px] mt-0.5 text-[11px] truncate ${r.error ? "font-semibold text-[#DC2626]" : "text-[#9a9da0]"}`} role={r.error ? "alert" : undefined}>
                        {r.error ?? (r.reading ? "Membaca tanggal dari berkas…" : r.hint)}
                      </p>
                    </div>
                  );
                })}
                <label className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#0F3B59] cursor-pointer hover:underline">
                  <Plus className="w-3.5 h-3.5" strokeWidth={2.4} /> Tambah berkas lain
                  <input type="file" multiple className="hidden" disabled={busy} onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
                </label>
              </div>
            </>
          )}
          {error && <p role="alert" className="px-5 pb-3 text-[11.5px] font-semibold text-[#DC2626]">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#EEF2F4]">
          <button onClick={close} disabled={busy} className="px-4 py-2 text-[13px] font-bold text-[#0F3B59] rounded-full hover:bg-[#E2E8EB] disabled:opacity-50">{doneCount > 0 ? "Selesai" : "Batal"}</button>
          <button onClick={submit} disabled={busy || pending === 0} className="px-5 py-2 text-[13px] font-bold rounded-full bg-[#0F3B59] hover:bg-[#0B2C43] text-white active:scale-[0.97] transition-all duration-200 disabled:opacity-50">
            {busy ? "Mengunggah…" : pending > 1 ? `Unggah ${pending} berkas` : "Unggah"}
          </button>
        </div>
      </div>
    </div>
  );
}


// Ikon berkas menurut ekstensi — pola yang sudah akrab dari Google Drive/Explorer.
function fileIconFor(title: string): { Icon: LucideIcon; color: string } {
  const t = title.toLowerCase();
  if (/\.(xlsx?|xlsm|csv)$/.test(t)) return { Icon: FileSpreadsheet, color: "#15803D" };
  return { Icon: FileText, color: "#DC2626" };
}

// Isi satu sub-dokumen (halaman, bukan popup), gaya daftar Google Drive: judul + tombol
// "Unggah" di kanan atas, tabel Nama / Tanggal terbit / Berlaku sampai / Status, dan seret
// berkas ke mana saja di jendela untuk mengunggah (lapisan "Lepaskan untuk mengunggah").
function CategoryView({ category, canWrite, onAdd }: { category: CategoryTile; canWrite: boolean; onAdd: (files?: File[]) => void }) {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const addRef = useRef(onAdd);
  addRef.current = onAdd;
  const chapter = PSI_CHAPTERS.find((c) => c.key === category.chapter);
  const todayIso = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!canWrite) return;
    let depth = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const enter = (e: DragEvent) => { if (!hasFiles(e)) return; depth += 1; setDragging(true); };
    const leave = (e: DragEvent) => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (depth === 0) setDragging(false); };
    const over = (e: DragEvent) => { if (hasFiles(e)) e.preventDefault(); };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      const dropped = Array.from(e.dataTransfer?.files ?? []);
      if (dropped.length) addRef.current(dropped);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, [canWrite]);

  return (
    <div>
      {dragging && (
        <div className="fixed inset-0 z-[250] pointer-events-none flex items-center justify-center bg-[#0F3B59]/15 backdrop-blur-[1px]">
          <div className="m-6 w-full max-w-[460px] rounded-[14px] border-2 border-dashed border-[#0F3B59] bg-white/95 px-8 py-10 text-center shadow-[0_24px_60px_-12px_rgba(15,23,42,.35)]">
            <UploadIcon className="w-8 h-8 text-[#0F3B59] mx-auto mb-3" strokeWidth={1.6} />
            <div className="font-heading text-[16px] font-bold text-[#0F172A]">Lepaskan untuk mengunggah</div>
            <div className="text-[12.5px] text-[#6b6e72] mt-1 truncate">ke {category.name}</div>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {chapter && (
            <div className="text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase mb-1">
              {chapter.label} · {chapter.title}
            </div>
          )}
          <h2 className="font-heading text-[17px] font-bold text-[#0F172A] leading-snug">
            {category.no != null && <span className="font-mono text-[#9a9da0] mr-1.5">{category.no}.</span>}
            {category.name}
          </h2>
          {category.keterangan && <p className="text-[12px] text-[#6b6e72] mt-1">Keterangan: {category.keterangan}</p>}
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={() => onAdd()}
            className="flex-shrink-0 inline-flex items-center gap-2 text-[13px] font-bold pl-3.5 pr-4 py-2.5 rounded-full bg-[#0F3B59] hover:bg-[#0B2C43] text-white shadow-[0_2px_6px_rgba(15,59,89,.25)] active:scale-[0.97] transition-all duration-200"
          >
            <Plus className="w-4 h-4" strokeWidth={2.4} />
            Unggah
          </button>
        )}
      </div>

      <div className="bg-white border border-[#D8E1E4] rounded-[14px] overflow-hidden">
        {category.documents.length === 0 ? (
          <div className="py-14 px-5 text-center">
            <FileText className="w-[34px] h-[34px] text-[#c3c6c9] mx-auto mb-3" strokeWidth={1.4} />
            <p className="text-[13.5px] font-semibold text-[#0F172A]">Belum ada dokumen</p>
            {canWrite && <p className="text-[12.5px] text-[#9a9da0] mt-1">Seret berkas ke sini atau tekan Unggah.</p>}
          </div>
        ) : (
          <>
            <div className="hidden sm:grid grid-cols-[1fr_130px_130px_120px] gap-3 px-4 py-2 border-b border-[#D8E1E4] bg-[#F8F9FA] text-[10.5px] font-bold tracking-[.05em] uppercase text-[#6b6e72]">
              <span>Nama</span>
              <span>Tanggal terbit</span>
              <span>Berlaku sampai</span>
              <span>Status</span>
            </div>
            {category.documents.map((d) => {
              const { Icon, color } = fileIconFor(d.title);
              const expired = d.expiryDate < todayIso;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => router.push(`/document/${d.id}`)}
                  className="w-full grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_130px_130px_120px] items-center gap-3 px-4 py-2.5 text-left border-b border-[#EEF2F4] last:border-b-0 hover:bg-[#F0F4F6] transition-colors duration-150"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-[22px] h-[22px] flex-shrink-0" strokeWidth={1.6} style={{ color }} />
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-[#0F172A] truncate">{d.title}</div>
                      <div className="text-[11px] font-mono text-[#9a9da0] truncate">
                        {d.documentNumber} · v{d.version}
                        <span className="sm:hidden"> · terbit {fmtDate(d.issueDate)}</span>
                      </div>
                    </div>
                  </div>
                  <span className="hidden sm:block text-[12px] text-[#3a3d40]">{fmtDate(d.issueDate)}</span>
                  <span className="hidden sm:block text-[12px] text-[#3a3d40]">{fmtDate(d.expiryDate)}</span>
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-[#0F172A]">
                    <span className="w-2 h-[3px] rounded-full" style={{ background: expired ? "#DC2626" : "#15803D" }} aria-hidden />
                    {expired ? "Kedaluwarsa" : "Berlaku"}
                  </span>
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}


function ChapterHeading({ label, title, count, total }: { label: string; title: string; count?: number; total?: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 mb-2.5">
      <div>
        <div className="text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">{label}</div>
        <h3 className="font-heading text-[14.5px] font-bold text-[#0F172A] leading-snug">{title}</h3>
      </div>
      {total != null && <span className="font-mono text-[11px] text-[#6b6e72] flex-shrink-0">{count} dari {total} ada dokumen</span>}
    </div>
  );
}

export default function DirectoryCategoryGrid({
  location,
  canWrite,
  categoryId,
  onSelectCategory,
  baseCrumbs,
}: {
  location: string;
  canWrite: boolean;
  /** Sub-dokumen yang sedang dibuka (dari URL); null = tampilan daftar sub-dokumen. */
  categoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  /** Level di atas lokasi (mis. "Direktori"), diteruskan dari halaman. */
  baseCrumbs: Crumb[];
}) {
  const { categories, isLoading, mutate } = useDocumentCategories(location);
  const [openTile, setOpenTile] = useState<CategoryTile | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const openUpload = (tile: CategoryTile, files: File[] = []) => {
    setPendingFiles(files);
    setOpenTile(tile);
  };

  if (isLoading) {
    return <div className="py-14 text-center text-[13px] text-[#9a9da0]">Memuat sub-dokumen...</div>;
  }

  if (categories.length === 0) {
    return (
      <div className="py-14 px-5 text-center">
        <FileText className="w-[30px] h-[30px] text-[#c3c6c9] mx-auto mb-2.5" strokeWidth={1.5} />
        <p className="text-[13px] text-[#9a9da0]">Belum ada sub-dokumen untuk lokasi ini.</p>
      </div>
    );
  }

  const selected = categoryId ? categories.find((c) => c.id === categoryId) ?? null : null;
  const crumbs: Crumb[] = [...baseCrumbs, { label: location, onClick: selected ? () => onSelectCategory(null) : undefined }];
  if (selected) crumbs.push({ label: selected.name });

  const upload = openTile && (
    <UploadIntoCategoryPanel
      key={openTile.id}
      location={location}
      category={openTile}
      initialFiles={pendingFiles}
      onClose={() => setOpenTile(null)}
      onUploaded={() => {
        setOpenTile(null);
        mutate();
      }}
    />
  );

  if (selected) {
    return (
      <>
        <Breadcrumb crumbs={crumbs} />
        <CategoryView category={selected} canWrite={canWrite} onAdd={(files) => openUpload(selected, files)} />
        {upload}
      </>
    );
  }

  const others = categories.filter((c) => c.chapter === null);
  const grid = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3";

  return (
    <>
      <Breadcrumb crumbs={crumbs} />
      {PSI_CHAPTERS.map((ch) => {
        const items = categories.filter((c) => c.chapter === ch.key);
        if (items.length === 0) return null;
        return (
          <section key={ch.key} className="mt-8 first:mt-0">
            <ChapterHeading label={ch.label} title={ch.title} count={items.filter((c) => c.documents.length > 0).length} total={items.length} />
            <div className={grid}>
              {items.map((c) => (
                <CategoryTileCard key={c.id} tile={c} onClick={() => onSelectCategory(c.id)} onFiles={canWrite ? (files) => openUpload(c, files) : undefined} />
              ))}
            </div>
          </section>
        );
      })}
      {(others.length > 0 || canWrite) && (
        <section className="mt-8">
          <ChapterHeading label="Di luar daftar PSI" title="Dokumen Lainnya" />
          <div className={grid}>
            {others.map((c) => (
              <CategoryTileCard key={c.id} tile={c} onClick={() => onSelectCategory(c.id)} onFiles={canWrite ? (files) => openUpload(c, files) : undefined} />
            ))}
            {canWrite && <AddCategoryTile location={location} onCreated={() => mutate()} />}
          </div>
        </section>
      )}
    </>
  );
}
