"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { usePsi } from "@/lib/psiStore";
import { useDocumentCategories, createDocumentCategory, type CategoryTile } from "@/lib/useDocumentCategories";
import { CATEGORY_STATUS_META } from "@/lib/domain/documentCategories";
import { PSI_CHAPTERS } from "@/lib/domain/psiSubChapters";
import Breadcrumb, { type Crumb } from "@/components/Breadcrumb";
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
            <div role="radiogroup" aria-label="Tipe PSI" className="grid grid-cols-2 gap-1.5">
              {PSI_TYPES.map((t) => {
                const sel = psiType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    onClick={() => setPsiType(t)}
                    className={`min-h-[40px] px-3 py-1.5 text-[12.5px] text-left rounded-[8px] border transition-colors duration-200 ${
                      sel ? "border-[#0F3B59] bg-[#E2E8EB] font-bold text-[#0B2C43]" : "border-[#C5CED3] bg-[#F5F7F9] text-[#0F172A] hover:border-[#9a9da0]"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
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

// Isi satu sub-dokumen (halaman, bukan popup): daftar dokumen di dalamnya + tombol
// tambah. Navigasi naik lewat breadcrumb di atas.
function CategoryView({ category, canWrite, onAdd }: { category: CategoryTile; canWrite: boolean; onAdd: () => void }) {
  const router = useRouter();
  const chapter = PSI_CHAPTERS.find((c) => c.key === category.chapter);
  return (
    <div>
      <div className="mb-4">
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

      <div className="bg-white border border-[#D8E1E4] rounded-[14px] overflow-hidden">
        {category.documents.length === 0 ? (
          <div className="py-12 px-5 text-center">
            <FileText className="w-[30px] h-[30px] text-[#c3c6c9] mx-auto mb-2.5" strokeWidth={1.5} />
            <p className="text-[13px] text-[#9a9da0]">Belum ada dokumen di sub-dokumen ini.</p>
          </div>
        ) : (
          category.documents.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => router.push(`/document/${d.id}`)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left border-b border-[#EEF2F4] last:border-b-0 hover:bg-[#F5F7F9] transition-colors duration-150"
            >
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-[#0F172A] truncate">{d.title}</div>
                <div className="text-[11px] font-mono text-[#9a9da0]">{d.documentNumber} · v{d.version} · terbit {fmtDate(d.issueDate)}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#c3c6c9] flex-shrink-0" strokeWidth={2} />
            </button>
          ))
        )}
      </div>

      {canWrite && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-3 text-[12.5px] font-bold px-3.5 py-2.5 rounded-[8px] border border-dashed border-[#C5CED3] text-[#6b6e72] hover:border-[#0F3B59] hover:text-[#0F3B59] transition-all duration-200"
        >
          + Tambahkan dokumen di sub-dokumen ini
        </button>
      )}
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
      location={location}
      category={openTile}
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
        <CategoryView category={selected} canWrite={canWrite} onAdd={() => setOpenTile(selected)} />
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
                <CategoryTileCard key={c.id} tile={c} onClick={() => onSelectCategory(c.id)} />
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
              <CategoryTileCard key={c.id} tile={c} onClick={() => onSelectCategory(c.id)} />
            ))}
            {canWrite && <AddCategoryTile location={location} onCreated={() => mutate()} />}
          </div>
        </section>
      )}
    </>
  );
}
