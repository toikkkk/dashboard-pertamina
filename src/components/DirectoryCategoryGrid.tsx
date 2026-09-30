"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { usePsi } from "@/lib/psiStore";
import { useDocumentCategories, createDocumentCategory, type CategoryTile } from "@/lib/useDocumentCategories";
import { CATEGORY_STATUS_META } from "@/lib/domain/documentCategories";
import { uploadFileToR2 } from "@/lib/uploadFile";
import { PSIType } from "@/lib/mockData";
import { Plus, Upload as UploadIcon, X, FileText, CheckCircle2, AlertTriangle, Circle, ChevronRight, type LucideIcon } from "lucide-react";

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
function CategoryTileCard({ tile, onClick }: { tile: CategoryTile; onClick: () => void }) {
  const meta = CATEGORY_STATUS_META[tile.status];
  const Icon = STATUS_ICON[tile.status];
  const color = STATUS_COLOR[tile.status];
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative overflow-hidden text-left p-3.5 pl-[18px] rounded-[14px] border border-[#D8E1E4] bg-white hover:border-[#0F3B59] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(15,59,89,.08)] transition-all duration-200 flex flex-col gap-2 min-h-[92px]"
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: color }} aria-hidden />
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12.5px] font-bold text-[#0F172A] leading-snug">{tile.name}</span>
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
        <div className="mt-auto text-[11px] text-[#9a9da0]">{meta.label}</div>
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

// Formulir unggah singkat untuk satu ubin kategori kosong — dibuka sebagai panel,
// bukan modal terpisah, supaya jelas dokumen ini akan masuk ke kategori yang mana.
function UploadIntoCategoryPanel({ location, category, onClose, onUploaded }: { location: string; category: CategoryTile; onClose: () => void; onUploaded: () => void }) {
  const { addNewDocument } = usePsi();
  const [title, setTitle] = useState(category.name);
  const [psiType, setPsiType] = useState<PSIType>("Informasi Teknologi Proses");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) return setError("Judul dokumen wajib diisi.");
    if (!file) return setError("Berkas wajib diunggah.");
    setError(null);
    setBusy(true);
    try {
      const locationCode = location.replace(/[()]/g, "").replace(/^(FT|IT|AFT)\s+/i, "").toUpperCase().replace(/\s+/g, "");
      const todayIso = new Date().toISOString().split("T")[0];
      const documentNumber = `PSI-${locationCode}-${todayIso.slice(0, 4)}-${String(Date.now()).slice(-4)}`;
      // Kedaluwarsa dihitung dari siklus tinjau kategori ini (5 tahun standar, 2
      // tahun untuk OSCP) — bukan angka tetap seperti formulir unggah lama.
      const expiry = new Date(`${todayIso}T00:00:00`);
      expiry.setMonth(expiry.getMonth() + category.reviewCycleMonths);
      const fileId = await uploadFileToR2(file);
      await addNewDocument({
        documentNumber,
        title: title.trim(),
        psiType,
        location,
        lifecyclePhase: "Operasi",
        isCircular: false,
        routes: [],
        fileId,
        expiryDate: expiry.toISOString().split("T")[0],
        categoryId: category.id,
      });
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan dokumen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0F172A]/40 px-4 animate-backdropIn" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-[420px] rounded-[14px] bg-white p-6 shadow-[0_24px_60px_-12px_rgba(15,23,42,.35)] animate-modalPop">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase mb-1">{category.name}</div>
            <h2 className="font-heading text-[17px] font-bold text-[#0F172A] leading-snug">Tambahkan Dokumen</h2>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="text-[#9a9da0] hover:text-[#0F172A]"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <div className="text-[10.5px] font-bold tracking-[.05em] text-[#6b6e72] uppercase mb-1.5">Judul Dokumen</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full min-h-[40px] px-3 text-[13px] border border-[#C5CED3] rounded-[8px] bg-[#F5F7F9] focus:bg-white focus:outline-none focus:border-[#0F3B59]" />
          </div>
          <div>
            <div className="text-[10.5px] font-bold tracking-[.05em] text-[#6b6e72] uppercase mb-1.5">Tipe PSI</div>
            <select value={psiType} onChange={(e) => setPsiType(e.target.value as PSIType)} className="w-full min-h-[40px] px-3 text-[13px] border border-[#C5CED3] rounded-[8px] bg-[#F5F7F9] focus:bg-white focus:outline-none focus:border-[#0F3B59]">
              {PSI_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[10.5px] font-bold tracking-[.05em] text-[#6b6e72] uppercase mb-1.5">Berkas</div>
            <label className="flex items-center gap-2 min-h-[40px] px-3 text-[13px] border border-dashed border-[#C5CED3] rounded-[8px] bg-[#F5F7F9] cursor-pointer hover:border-[#0F3B59]">
              <UploadIcon className="w-4 h-4 text-[#6b7780] flex-shrink-0" strokeWidth={1.8} />
              <span className="truncate text-[#0F172A]">{file ? file.name : "Pilih berkas..."}</span>
              <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          {error && <p role="alert" className="text-[11.5px] font-semibold text-[#DC2626]">{error}</p>}
          <button onClick={submit} disabled={busy} className="mt-1 w-full bg-[#0F3B59] hover:bg-[#0B2C43] text-white font-heading font-bold text-[13.5px] py-2.5 rounded-[8px] active:scale-[0.98] transition-all duration-200 disabled:opacity-60">
            {busy ? "Menyimpan…" : "Simpan Dokumen"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Satu kategori bisa punya lebih dari satu dokumen (mis. beberapa produk SDS
// berbeda) — dulu ubin langsung lompat ke dokumen TERBARU saja, yang lain jadi
// tak terlihat/tak terjangkau dari Direktori (celah yang ditemukan user). Modal
// ini dibuka dulu kalau ada >1 dokumen, supaya user memilih yang mana.
function CategoryDocumentsModal({ category, canWrite, onClose, onAddAnother }: { category: CategoryTile; canWrite: boolean; onClose: () => void; onAddAnother: () => void }) {
  const router = useRouter();
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0F172A]/40 px-4 animate-backdropIn"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[440px] max-h-[80vh] rounded-[14px] bg-white flex flex-col shadow-[0_24px_60px_-12px_rgba(15,23,42,.35)] animate-modalPop overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4">
          <div>
            <div className="text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase mb-1">{category.name}</div>
            <h2 className="font-heading text-[17px] font-bold text-[#0F172A] leading-snug">{category.documents.length} Dokumen</h2>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="text-[#9a9da0] hover:text-[#0F172A]"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {category.documents.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => router.push(`/document/${d.id}`)}
              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-[8px] text-left hover:bg-[#F5F7F9] transition-colors duration-150"
            >
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold text-[#0F172A] truncate">{d.title}</div>
                <div className="text-[10.5px] font-mono text-[#9a9da0]">v{d.version} · {fmtDate(d.issueDate)}</div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#c3c6c9] flex-shrink-0" strokeWidth={2} />
            </button>
          ))}
        </div>
        {canWrite && (
          <div className="px-6 pb-6 pt-1">
            <button
              type="button"
              onClick={onAddAnother}
              className="w-full text-[12.5px] font-bold px-3.5 py-2.5 rounded-[8px] border border-dashed border-[#C5CED3] text-[#6b6e72] hover:border-[#0F3B59] hover:text-[#0F3B59] transition-all duration-200"
            >
              + Tambahkan dokumen lain di kategori ini
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default function DirectoryCategoryGrid({ location, canWrite }: { location: string; canWrite: boolean }) {
  const router = useRouter();
  const { categories, isLoading, mutate } = useDocumentCategories(location);
  const [openTile, setOpenTile] = useState<CategoryTile | null>(null);
  const [listTile, setListTile] = useState<CategoryTile | null>(null);

  const handleTileClick = (tile: CategoryTile) => {
    if (tile.documents.length > 1) setListTile(tile);
    else if (tile.document) router.push(`/document/${tile.document.id}`);
    else if (canWrite) setOpenTile(tile);
  };

  if (isLoading) {
    return <div className="py-14 text-center text-[13px] text-[#9a9da0]">Memuat sub-kategori...</div>;
  }

  if (categories.length === 0) {
    return (
      <div className="py-14 px-5 text-center">
        <FileText className="w-[30px] h-[30px] text-[#c3c6c9] mx-auto mb-2.5" strokeWidth={1.5} />
        <p className="text-[13px] text-[#9a9da0]">Belum ada sub-kategori dokumen untuk lokasi ini.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {categories.map((c) => (
          <CategoryTileCard key={c.id} tile={c} onClick={() => handleTileClick(c)} />
        ))}
        {canWrite && <AddCategoryTile location={location} onCreated={() => mutate()} />}
      </div>
      {listTile && (
        <CategoryDocumentsModal
          category={listTile}
          canWrite={canWrite}
          onClose={() => setListTile(null)}
          onAddAnother={() => {
            if (!canWrite) return;
            setOpenTile(listTile);
            setListTile(null);
          }}
        />
      )}
      {openTile && (
        <UploadIntoCategoryPanel
          location={location}
          category={openTile}
          onClose={() => setOpenTile(null)}
          onUploaded={() => {
            setOpenTile(null);
            mutate();
          }}
        />
      )}
    </>
  );
}
