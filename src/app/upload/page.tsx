"use client";

// Dokumen Baru — alur yang sama dengan Direktori: pilih lokasi (Admin Regional bebas, user lokasi terkunci ke
// lokasinya), pilih sub-dokumen tujuan, lalu seret/pilih berkas → dialog unggah (judul & tanggal terbit dibaca
// dari berkas). Unggahan berjalan di latar dengan kartu progres kanan-bawah. Menggantikan formulir lama yang
// punya kolom yang tidak pernah tersimpan (Fungsi Bertanggung Jawab, Deskripsi Lokasi).
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Upload as UploadIcon, X } from "lucide-react";
import { usePsi } from "@/lib/psiStore";
import { isRegionalUnit } from "@/lib/domain/regionalUnit";
import { useDocumentCategories } from "@/lib/useDocumentCategories";
import CategoryPicker from "@/components/directory/CategoryPicker";
import { UploadIntoCategoryPanel } from "@/components/DirectoryCategoryGrid";

const TYPE_ORDER = ["AFT", "FT", "IT", "Plant"];

export default function UploadPage() {
  const { activeUser, locations } = usePsi();
  const isAdmin = !!activeUser.isRegionalAdmin;
  const [location, setLocation] = useState<string>(activeUser.location ?? "");
  const [locQuery, setLocQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [files, setFiles] = useState<File[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [queued, setQueued] = useState<{ location: string; categoryId: string; name: string } | null>(null);

  const { categories, isLoading, mutate } = useDocumentCategories(location || null);
  const category = categories.find((c) => c.id === categoryId) ?? null;

  const grouped = useMemo(() => {
    const q = locQuery.trim().toLowerCase();
    return TYPE_ORDER.map((t) => ({
      type: t,
      items: locations.filter((l) => l.locationType === t && (!q || l.locationName.toLowerCase().includes(q))).sort((a, b) => a.locationName.localeCompare(b.locationName)),
    })).filter((g) => g.items.length > 0);
  }, [locations, locQuery]);

  const pickFiles = (list: FileList | File[] | null | undefined) => {
    const arr = Array.from(list ?? []);
    if (arr.length && category) setFiles(arr);
  };

  // Unit Regional tidak mengunggah dokumen PSI (PSI hanya di terminal); MOC regional dibuat dari menu MOC.
  if (isRegionalUnit(activeUser.location)) {
    return (
      <div className="max-w-[860px] mx-auto bg-white border border-[#D8E1E4] rounded-[14px] py-14 px-6 text-center">
        <p className="text-[14px] font-bold text-[#0F172A] mb-1">Unit Regional tidak mengunggah dokumen PSI.</p>
        <p className="text-[12.5px] text-[#6b6e72]">
          Dokumen PSI hanya ada di terminal. Untuk pengajuan perubahan, buka menu <Link href="/moc" className="font-bold text-[#0F3B59] underline">MOC</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[860px] mx-auto">
      <h1 className="font-heading text-[22px] font-bold text-[#0F172A] mb-1">Dokumen Baru</h1>

      {queued && (
        <div role="status" className="my-4 flex items-center gap-2 px-3.5 py-2.5 rounded-[8px] bg-[#EAF5EE] border border-[#BFE0CC] text-[12.5px] font-semibold text-[#15663A]">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" strokeWidth={2.2} />
          <span className="flex-1 min-w-0">Unggahan ke “{queued.name}” berjalan di latar — pantau di kartu kanan bawah.</span>
          <Link href={`/directory?location=${encodeURIComponent(queued.location)}&category=${queued.categoryId}`} className="inline-flex items-center gap-1 font-bold hover:underline flex-shrink-0">
            Buka sub-dokumen <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <button type="button" onClick={() => setQueued(null)} aria-label="Tutup pemberitahuan" className="text-[#15663A]/70 hover:text-[#15663A]"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="mt-4 grid gap-4">
        <section className="bg-white border border-[#D8E1E4] rounded-[14px] p-5">
          <h2 className="text-[10.5px] font-bold tracking-[.05em] uppercase text-[#6b6e72] mb-3">1 · Lokasi</h2>
          {isAdmin ? (
            <>
              <input
                value={locQuery}
                onChange={(e) => setLocQuery(e.target.value)}
                placeholder="Cari lokasi…"
                aria-label="Cari lokasi"
                className="w-full max-w-[320px] min-h-[38px] px-3 mb-3 text-[13px] border border-[#C5CED3] rounded-[8px] bg-white focus:outline-none focus:border-[#0F3B59]"
              />
              <div className="flex flex-col gap-3" role="radiogroup" aria-label="Lokasi">
                {grouped.map((g) => (
                  <div key={g.type} className="flex items-start gap-3">
                    <span className="w-12 pt-1.5 font-mono text-[11px] text-[#9a9da0] flex-shrink-0">{g.type}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {g.items.map((l) => {
                        const sel = location === l.locationName;
                        return (
                          <button
                            key={l.locationName}
                            type="button"
                            role="radio"
                            aria-checked={sel}
                            onClick={() => { setLocation(l.locationName); setCategoryId(null); }}
                            className={`px-3 py-1.5 text-[12.5px] rounded-full border transition-colors duration-150 ${sel ? "border-[#0F3B59] bg-[#0F3B59] text-white font-bold" : "border-[#C5CED3] bg-white text-[#3a3d40] hover:bg-[#F0F4F6]"}`}
                          >
                            {l.locationName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <span className="inline-flex px-3 py-1.5 text-[12.5px] rounded-full border border-[#0F3B59] bg-[#E2E8EB] text-[#0B2C43] font-bold">{activeUser.location}</span>
          )}
        </section>

        <section className={`bg-white border border-[#D8E1E4] rounded-[14px] p-5 ${location ? "" : "opacity-50 pointer-events-none"}`}>
          <h2 className="text-[10.5px] font-bold tracking-[.05em] uppercase text-[#6b6e72] mb-3">2 · Sub-dokumen tujuan</h2>
          {isLoading ? (
            <p className="py-8 text-center text-[13px] text-[#9a9da0]">Memuat sub-dokumen…</p>
          ) : (
            <CategoryPicker key={location} categories={categories} selectedId={categoryId} onSelect={setCategoryId} listClassName="max-h-[360px]" />
          )}
        </section>

        <section className={`bg-white border border-[#D8E1E4] rounded-[14px] p-5 ${category ? "" : "opacity-50 pointer-events-none"}`}>
          <h2 className="text-[10.5px] font-bold tracking-[.05em] uppercase text-[#6b6e72] mb-3">3 · Berkas</h2>
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFiles(e.dataTransfer.files); }}
            className={`flex flex-col items-center justify-center gap-2 py-10 text-center border-2 border-dashed rounded-[14px] cursor-pointer transition-colors duration-150 ${dragOver ? "border-[#0F3B59] bg-[#E2E8EB]" : "border-[#C5CED3] bg-[#F5F7F9] hover:border-[#0F3B59]"}`}
          >
            <UploadIcon className="w-8 h-8 text-[#0F3B59]" strokeWidth={1.5} />
            <span className="text-[14px] font-semibold text-[#0F172A]">Seret berkas ke sini</span>
            <span className="text-[12.5px] text-[#6b6e72]">atau <span className="text-[#0F3B59] font-bold underline">pilih dari komputer</span>{category ? ` — masuk ke ${category.name}` : ""}</span>
            <input type="file" multiple className="hidden" onChange={(e) => { pickFiles(e.target.files); e.target.value = ""; }} />
          </label>
        </section>
      </div>

      {files && category && (
        <UploadIntoCategoryPanel
          key={`${category.id}-${files.length}`}
          location={location}
          category={category}
          initialFiles={files}
          onClose={() => setFiles(null)}
          onUploaded={() => { setFiles(null); void mutate(); }}
          onQueued={() => setQueued({ location, categoryId: category.id, name: category.name })}
        />
      )}
    </div>
  );
}
