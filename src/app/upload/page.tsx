"use client";

import React, { useEffect, useState } from "react";
import { usePsi } from "@/lib/psiStore";
import { useRouter } from "next/navigation";
import SuccessPopup from "@/components/SuccessPopup";
import { PSIType, LifecyclePhase } from "@/lib/mockData";
import { uploadFileToR2 } from "@/lib/uploadFile";
import { useDocumentCategories } from "@/lib/useDocumentCategories";
import CategoryPickerField from "@/components/CategoryPickerField";
import LocationPickerField from "@/components/LocationPickerField";
import { Upload as UploadIcon, ChevronDown, X } from "lucide-react";

const PSI_TYPES: PSIType[] = [
  "Informasi Bahan Berbahaya",
  "Informasi Teknologi Proses",
  "Informasi Peralatan",
  "Sistem Tata Kerja",
];

export default function UploadPage() {
  const router = useRouter();
  const { locations, addNewDocument, activeUser } = usePsi();

  const [dateAndTimestamp, setDateAndTimestamp] = useState(new Date().toISOString().slice(0, 16));
  // Fallback to the first location is defensive only — AuthGuard blocks anyone whose
  // location isn't assigned yet from ever reaching this page, so activeUser.location
  // is always set here in practice; TS just can't see that guarantee across files.
  const [location, setLocation] = useState(activeUser.isRegionalAdmin ? locations[0].locationName : (activeUser.location ?? locations[0].locationName));
  const [responsibleFunction, setResponsibleFunction] = useState("");
  const [title, setTitle] = useState("");
  const [locationDescription, setLocationDescription] = useState("");
  const [psiType, setPsiType] = useState<PSIType | null>(null);
  // Sub-kategori grid Direktori (2026-09-28) — kalau tidak dipilih di sini, dokumen
  // tetap tersimpan seperti biasa tapi TIDAK akan muncul di kartu kategori manapun
  // di Direktori lokasi itu (celah yang sempat ditemukan, sekarang ditutup di sini
  // dan di Arsip Registry → Tautkan). Dibuat opsional karena tidak semua dokumen
  // (mis. "Informasi Peralatan"/"Sistem Tata Kerja") punya sub-kategori yang cocok.
  const [categoryId, setCategoryId] = useState("");
  const { categories: availableCategories } = useDocumentCategories(location);
  // Kategori sebelumnya bisa jadi milik lokasi lain — reset saat lokasi berganti
  // (relevan terutama untuk Admin Regional, yang boleh pilih lokasi mana pun).
  useEffect(() => { setCategoryId(""); }, [location]);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [lifecyclePhase] = useState<LifecyclePhase>("Operasi");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<{ title?: string; file?: string }>({});
  const [saved, setSaved] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const nextErrors: { title?: string; file?: string } = {};
    if (!title.trim()) nextErrors.title = "Judul dokumen wajib diisi.";
    if (!file) nextErrors.file = "Berkas wajib diunggah.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !file) return;

    const locationCode = location.replace(/^(FT|IT|AFT)\s+/i, "").toUpperCase().replace(/\s+/g, "");
    const todayIso = new Date().toISOString().split("T")[0];
    const documentNumber = `PSI-${locationCode}-${todayIso.slice(0, 4)}-${String(Date.now()).slice(-4)}`;
    const expiryDate = `${Number(todayIso.slice(0, 4)) + 5}${todayIso.slice(4)}`;

    setSubmitting(true);
    try {
      const fileId = await uploadFileToR2(file);
      await addNewDocument({
        documentNumber,
        title,
        psiType: psiType ?? PSI_TYPES[0],
        location,
        lifecyclePhase,
        // PSI bersifat kustodial (Controller saja, tanpa persetujuan) — sesuai rapat klien;
        // sirkuler hanya untuk MOC.
        isCircular: false,
        routes: [],
        fileId,
        expiryDate,
        categoryId: categoryId || undefined,
      });

      setSaved(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Gagal menyimpan dokumen.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {saved && <SuccessPopup message="Dokumen tersimpan" onClose={() => router.push("/")} />}
      <form onSubmit={handleSubmit} className="bg-white border border-[#D8E1E4] rounded-[12px] shadow-[0_2px_6px_rgba(15,23,42,.045)] p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-[#3a3d40] mb-[5px]">Tanggal dan Waktu</label>
            <input
              type="datetime-local"
              value={dateAndTimestamp}
              onChange={(e) => setDateAndTimestamp(e.target.value)}
              className="w-full min-h-[36px] px-2.5 py-1 text-[13px] border border-[#C5CED3] rounded-[8px]"
            />
          </div>
          <div>
            <LocationPickerField
              label="Lokasi Operasional"
              locations={locations}
              value={location}
              onChange={setLocation}
              disabled={!activeUser.isRegionalAdmin}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-[#3a3d40] mb-[5px]">Fungsi yang Bertanggung Jawab</label>
          <input
            type="text"
            value={responsibleFunction}
            onChange={(e) => setResponsibleFunction(e.target.value)}
            placeholder="mis. Fungsi HSE FT Malang"
            className="w-full min-h-[36px] px-2.5 py-1 text-[13px] border border-[#C5CED3] rounded-[8px]"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-[#3a3d40] mb-[5px]">Judul Dokumen <span className="text-[#DC2626]">*</span></label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="mis. Informasi Bahan Berbahaya Tangki T-102"
            className="w-full min-h-[36px] px-2.5 py-1 text-[13px] rounded-[8px]"
            style={{ border: `1px solid ${errors.title ? "#DC2626" : "#C5CED3"}` }}
          />
          {errors.title && <p className="mt-1 text-[11px] text-[#DC2626]">{errors.title}</p>}
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-[#3a3d40] mb-[5px]">Deskripsi Lokasi</label>
          <textarea
            value={locationDescription}
            onChange={(e) => setLocationDescription(e.target.value)}
            placeholder="Deskripsi lokasi fisik / unit terkait..."
            className="w-full min-h-[70px] px-2.5 py-2 text-[13px] border border-[#C5CED3] rounded-[8px] resize-y"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-[#3a3d40] mb-[5px]">Jenis PSI <span className="text-[#DC2626]">*</span></label>
          <button
            type="button"
            onClick={() => setShowTypeModal(true)}
            className="w-full min-h-[36px] px-3 py-1 text-[13px] border border-[#C5CED3] rounded-[8px] bg-white flex items-center justify-between text-left transition-colors duration-200 hover:border-[#9a9da0]"
          >
            <span style={{ color: psiType ? "#0F172A" : "#9a9da0" }}>{psiType ?? "Pilih jenis PSI..."}</span>
            <ChevronDown className="w-[13px] h-[13px] text-[#9a9da0]" strokeWidth={2} />
          </button>
        </div>

        <div className="mb-4">
          <CategoryPickerField
            categories={availableCategories}
            value={categoryId}
            onChange={setCategoryId}
            helperText="Menentukan kartu mana di grid Direktori lokasi ini yang akan menampilkan dokumen ini."
          />
        </div>

        <div className="mb-5">
          <label className="block text-xs font-semibold text-[#3a3d40] mb-[5px]">Upload Berkas <span className="text-[#DC2626]">*</span></label>
          <input id="mainFileInput" type="file" accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
          <label
            htmlFor="mainFileInput"
            className="flex items-center gap-[7px] min-h-[36px] px-3 py-1 text-[12.5px] rounded-[8px] bg-white cursor-pointer w-full transition-colors duration-200 hover:bg-[#f7f8f8]"
            style={{ border: `1px solid ${errors.file ? "#DC2626" : "#C5CED3"}`, color: file ? "#0F172A" : "#9a9da0" }}
          >
            <UploadIcon className="w-[14px] h-[14px] text-[#6b6e72]" strokeWidth={1.7} />
            {file ? file.name : "Pilih Berkas"}
          </label>
          <p className="mt-1 text-[10.5px] text-[#9a9da0]">Format PDF, Word (.docx), Excel (.xlsx), atau gambar (JPG/PNG), maksimum 500MB.</p>
          {errors.file && <p className="mt-1 text-[11px] text-[#DC2626]">{errors.file}</p>}
        </div>

        {submitError && (
          <div className="mb-3.5 px-4 py-2.5 bg-[#FEE2E2] border border-[#FECACA] rounded-[8px] text-[12.5px] font-semibold text-[#DC2626]">
            {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="min-h-[44px] px-6 font-heading font-bold text-[14.5px] bg-[#0F3B59] hover:bg-[#0B2C43] active:scale-[0.97] text-white rounded-[8px] transition disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {submitting ? "Mengunggah…" : "Simpan Dokumen"}
        </button>
      </form>

      {showTypeModal && (
        <div className="fixed inset-0 bg-[rgba(29,45,61,.5)] flex items-center justify-center z-[100] p-5 animate-backdropIn">
          <div className="w-[520px] max-w-full bg-white rounded-xl p-[22px] animate-modalPop">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold">Pilih Jenis PSI</h3>
              <button type="button" onClick={() => setShowTypeModal(false)} className="p-1">
                <X className="w-4 h-4 text-[#6b6e72]" strokeWidth={1.8} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {PSI_TYPES.map((t) => {
                const selected = psiType === t;
                return (
                  <div
                    key={t}
                    onClick={() => {
                      setPsiType(t);
                      setShowTypeModal(false);
                    }}
                    className="p-3.5 rounded-[8px] cursor-pointer transition active:scale-[0.97] hover:shadow-[0_2px_8px_rgba(0,0,0,.06)]"
                    style={{ border: `1px solid ${selected ? "#0F3B59" : "#C5CED3"}`, background: selected ? "#E2E8EB" : "#fff" }}
                  >
                    <div className="text-[13px] font-bold text-[#0F172A]">{t}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
