"use client";

import React, { useState, useEffect } from "react";
import { usePsi } from "@/lib/psiStore";
import { useRouter } from "next/navigation";
import CircularRoutingBuilder from "@/components/CircularRoutingBuilder";
import { ApprovalRouteItem, PSIType, LifecyclePhase, PSI_TYPE_REQUIRES_CIRCULAR } from "@/lib/mockData";
import {
  Upload, ArrowLeft, CheckCircle,
  HelpCircle, Calendar, Layers, Check, AlertCircle
} from "lucide-react";
import Link from "next/link";

export default function UploadPage() {
  const router = useRouter();
  const { locations, addNewDocument, activeUser } = usePsi();

  // P-HORSE Authentic Form States (Sesuai Screenshot Klien ke-5)
  const [dateAndTimestamp, setDateAndTimestamp] = useState(new Date().toISOString().split("T")[0]);
  const [location, setLocation] = useState(activeUser.isRegionalAdmin ? locations[0].locationName : activeUser.location);
  const [responsibleFunction, setResponsibleFunction] = useState("Pertamina Group - 3. SH Downstream - 3.6.3.8 Regional Jatimbalinus - Senior Manager Operation & Maintenance (SMOM) & COS");
  const [title, setTitle] = useState("");
  const [locationDescription, setLocationDescription] = useState("Area Tankyard, Pumphouse & Loading Manifold");
  const [psiType, setPsiType] = useState<PSIType>("Informasi Bahan Berbahaya");

  // Modal state for picking Tipe Audit / Jenis PSI (Sesuai Screenshot Klien ke-5)
  const [showTypeModal, setShowTypeModal] = useState(false);

  // File & routing states
  const [lifecyclePhase, setLifecyclePhase] = useState<LifecyclePhase>("Operasi");
  const [file, setFile] = useState<File | null>(null);
  const [isCircular, setIsCircular] = useState(PSI_TYPE_REQUIRES_CIRCULAR[psiType]);
  const [isCircularManuallySet, setIsCircularManuallySet] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [routes, setRoutes] = useState<ApprovalRouteItem[]>([
    { stepOrder: 1, approverName: "Fungsi A (HSSE Engineer)", approverRole: "Validator", status: "Pending" },
    { stepOrder: 1, approverName: "Fungsi B (Ops Engineer)", approverRole: "Validator", status: "Pending" },
    { stepOrder: 2, approverName: "Terminal Manager / SMOM", approverRole: "Final Approver", status: "Pending" },
  ]);

  // Poin #5 & #9 Klien: sirkuler cuma wajib untuk sebagian Jenis PSI. Toggle di-set
  // otomatis mengikuti PSI_TYPE_REQUIRES_CIRCULAR saat Jenis PSI berubah, tapi berhenti
  // "menimpa" begitu user pernah ubah toggle-nya manual.
  useEffect(() => {
    if (!isCircularManuallySet) {
      setIsCircular(PSI_TYPE_REQUIRES_CIRCULAR[psiType]);
    }
  }, [psiType, isCircularManuallySet]);

  // 4 kategori resmi Jenis PSI (sesuai TKO 02. Process Safety) — dipakai juga oleh
  // kalkulasi kepatuhan per Jenis PSI di ComplianceChart, jadi nilainya harus konsisten.
  const psiCategories: { id: PSIType; label: string }[] = [
    { id: "Informasi Bahan Berbahaya", label: "Informasi Bahan Berbahaya (Hazardous Material)" },
    { id: "Informasi Teknologi Proses", label: "Informasi Teknologi Proses (Process Technology)" },
    { id: "Informasi Peralatan", label: "Informasi Peralatan (Equipment Information)" },
    { id: "Sistem Tata Kerja", label: "Sistem Tata Kerja (Work System)" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !file) {
      setFormError("Harap lengkapi Judul (Tujuan) dan pilih berkas PDF dari komputer Anda.");
      return;
    }
    setFormError(null);

    // Nomor dokumen & tanggal expired di-generate otomatis: PSI wajib dikaji ulang
    // setiap 5 tahun (lihat extendValidity/reviseDocument di psiStore.tsx), dan issueDate
    // sendiri diisi oleh addNewDocument dengan tanggal hari ini, jadi expiryDate dihitung
    // dari tanggal hari ini juga (bukan dari input "Tanggal dan waktu" di atas).
    const locationCode = location.replace(/^(FT|IT|AFT)\s+/i, "").toUpperCase().replace(/\s+/g, "");
    const todayIso = new Date().toISOString().split("T")[0];
    const documentNumber = `PSI-${locationCode}-${todayIso.slice(0, 4)}-${String(Date.now()).slice(-4)}`;
    const expiryDate = `${Number(todayIso.slice(0, 4)) + 5}${todayIso.slice(4)}`;

    addNewDocument({
      documentNumber,
      title,
      psiType,
      location,
      lifecyclePhase,
      isCircular,
      routes: isCircular ? routes : [],
      fileUrl: `https://pub-r2.cloudflare.com/phorse-dms/${file.name}`,
      expiryDate,
    });

    setSuccessNotice(`Dokumen "${title}" berhasil didaftarkan.`);
    setTimeout(() => router.push("/"), 1200);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
      
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#284B63] hover:text-blue-800 bg-white px-3 py-1.5 rounded-lg border border-[#D9D9D9] shadow-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dasbor</span>
        </Link>
        <span className="text-xs font-mono font-bold bg-blue-100 text-[#284B63] px-3 py-1 rounded border border-blue-200 shadow-sm">
          Registrasi Dokumen Process Safety Information
        </span>
      </div>

      {formError && (
        <div className="bg-rose-50 border border-rose-300 text-rose-900 font-semibold text-xs p-3.5 rounded-xl flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {successNotice && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 font-semibold text-xs p-3.5 rounded-xl flex items-center gap-2 shadow-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg border border-[#D9D9D9] overflow-hidden">
        
        {/* Form Header */}
        <div className="bg-white text-[#353535] p-5 sm:p-6 border-b-4 border-[#284B63] relative">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#284B63] bg-blue-50 px-3 py-1 rounded-full border border-blue-200 inline-block mb-2">
            Formulir Registrasi Kasus & Dokumen TKO
          </span>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#284B63]">
            Registrasikan Dokumen / Modul Tindak Lanjut Baru
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mt-1 leading-relaxed">
            Mengatur informasi metadata proses, lokasi fasilitas operasional Regional Jatimbalinus, serta alur persetujuan sirkuler paralel mau pun sekuensial.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">

          {/* Row 1: Tanggal & Waktu, Lokasi, Fungsi Bertanggung Jawab */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Tanggal dan waktu */}
            <div>
              <label className="block text-xs font-bold text-[#353535] mb-1.5 flex items-center gap-1">
                <span className="text-rose-600">*</span>
                <span>Tanggal dan waktu</span>
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dateAndTimestamp}
                  onChange={(e) => setDateAndTimestamp(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-[#D9D9D9] font-bold text-[#353535] bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#284B63] shadow-sm"
                  required
                />
                <Calendar className="w-4 h-4 text-blue-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Lokasi */}
            <div>
              <label className="block text-xs font-bold text-[#353535] mb-1.5 flex items-center gap-1">
                <span className="text-rose-600">*</span>
                <span>Lokasi Operasional / Terminal</span>
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={!activeUser.isRegionalAdmin && location !== activeUser.location}
                className="w-full text-xs p-3 rounded-xl border border-[#D9D9D9] font-bold text-[#353535] bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#284B63] shadow-sm disabled:bg-slate-200 cursor-pointer"
              >
                {locations.map((loc) => (
                  <option key={loc.locationName} value={loc.locationName}>
                    Pertamina Group - Regional JatimBalinus - {loc.locationName}
                  </option>
                ))}
              </select>
            </div>

            {/* Fungsi yang bertanggung jawab */}
            <div>
              <label className="block text-xs font-bold text-[#353535] mb-1.5 flex items-center gap-1">
                <span className="text-rose-600">*</span>
                <span>Fungsi yang bertanggung jawab</span>
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={responsibleFunction}
                  onChange={(e) => setResponsibleFunction(e.target.value)}
                  placeholder="Mencari fungsi..."
                  className="w-full text-xs p-3 rounded-xl border border-[#D9D9D9] font-semibold text-[#353535] bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#284B63] shadow-sm truncate"
                />
              </div>
            </div>

          </div>

          {/* Row 2: Judul (tujuan) */}
          <div>
            <label className="block text-xs font-bold text-[#353535] mb-1.5 flex items-center gap-1">
              <span className="text-rose-600">*</span>
              <span>Judul (tujuan) Kasus / Dokumen PSI</span>
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: HAZOP-21 Melakukan kajian pemasangan fixed gas detector sistem di area Tankyard"
              className="w-full text-sm font-extrabold p-3.5 rounded-xl border border-[#D9D9D9] text-[#353535] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#284B63] shadow-inner bg-slate-50/50"
              required
            />
          </div>

          {/* Row 3: Location description & Tipe Audit / Jenis PSI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Location description */}
            <div>
              <label className="block text-xs font-bold text-[#353535] mb-1.5 flex items-center gap-1">
                <span>Location description</span>
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              </label>
              <input
                type="text"
                value={locationDescription}
                onChange={(e) => setLocationDescription(e.target.value)}
                placeholder="Contoh: AFT Eltari - Tankyard / Pumphouse"
                className="w-full text-xs p-3 rounded-xl border border-[#D9D9D9] font-semibold text-[#353535] bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#284B63] shadow-sm"
              />
            </div>

            {/* Tipe Audit / Jenis PSI dengan POPUP PILIHAN RESMI (Sesuai Screenshot Klien ke-5) */}
            <div className="relative">
              <label className="block text-xs font-bold text-[#353535] mb-1.5 flex items-center gap-1">
                <span className="text-rose-600">*</span>
                <span>Tipe audit / Jenis PSI (02. Process Safety)</span>
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              </label>
              <div 
                onClick={() => setShowTypeModal(!showTypeModal)}
                className="w-full p-3 rounded-xl border border-[#D9D9D9] bg-slate-50 font-extrabold text-[#353535] flex items-center justify-between cursor-pointer hover:border-[#284B63] transition shadow-sm text-xs"
              >
                <span>{psiType}</span>
                <span className="text-blue-600 font-bold bg-blue-100 px-2 py-0.5 rounded text-[11px] border border-blue-200">
                  Ubah Opsi v
                </span>
              </div>

              {/* POPUP GRID MODAL (Exact replication of P-HORSE Screenshot 5!) */}
              {showTypeModal && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border-2 border-[#D9D9D9] shadow-2xl p-5 z-50 animate-fadeIn space-y-4">
                  <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-2">
                    <span className="font-extrabold text-xs text-[#284B63]">Pilih Tipe Audit / Standar TKO:</span>
                    <button type="button" onClick={() => setShowTypeModal(false)} className="text-slate-400 hover:text-rose-600 font-bold text-sm">&times;</button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5 text-xs">
                    {psiCategories.map((t) => (
                      <label 
                        key={t.id} 
                        onClick={() => { setPsiType(t.id); setShowTypeModal(false); }}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
                          psiType === t.id ? "bg-blue-50 border-[#284B63] text-[#284B63] font-black" : "bg-slate-50 border-[#D9D9D9] text-slate-700 hover:bg-slate-100 font-medium"
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="typeAudit" 
                          checked={psiType === t.id} 
                          onChange={() => {}} 
                          className="text-[#284B63]"
                        />
                        <span className="truncate">{t.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowTypeModal(false)}
                      className="px-6 py-1.5 bg-[#284B63] hover:bg-[#1E3A4F] text-white font-extrabold text-xs rounded-lg shadow-md transition"
                    >
                      Selesai
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Upload Berkas R2 Storage */}
          <div className="border-t border-[#D9D9D9] pt-5">
            <label className="block text-xs font-bold text-[#353535] mb-2 flex items-center gap-1">
              <span className="text-rose-600">*</span>
              <span>Unggah Berkas Resmi (PDF / SCAN Tanda Tangan)</span>
            </label>

            <div className="relative border-2 border-dashed border-[#D9D9D9] hover:border-[#284B63] rounded-xl p-6 text-center bg-slate-50 transition-all">
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              {file ? (
                <div className="text-emerald-700 font-extrabold text-sm flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" />
                  <span>File Siap Unggah: <strong>{file.name}</strong></span>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-sm font-extrabold text-[#284B63] block">Klik atau seret file dokumen PDF ke area ini</span>
                  <span className="text-xs text-slate-500 block">Maksimal kapasitas berkas 25 MB per dokumen.</span>
                </div>
              )}
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Pilih berkas"
                required={!file}
              />
            </div>
          </div>

          {/* SIRKULER TOGGLE & BUILDER (Poin #5 & #9 Klien) */}
          <div className="border-t border-[#D9D9D9] pt-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-blue-50/70 p-4 rounded-xl border border-blue-200">
              <div>
                <h3 className="text-base font-black text-[#284B63] flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#3C6E71]" />
                  <span>Aktifkan Alur Sirkuler Akun</span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Jika aktif, dokumen wajib melalui persetujuan berjenjang. Jika dinonaktifkan, dokumen langsung berstatus <strong>Direct Approved</strong>.
                </p>
                <p className="text-[11px] text-blue-700 mt-1.5 font-semibold">
                  {isCircularManuallySet
                    ? "Diatur manual — tidak lagi mengikuti saran otomatis berdasarkan Jenis PSI."
                    : `Disarankan otomatis berdasarkan Jenis PSI "${psiType}". Anda tetap bisa menimpa manual.`}
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={isCircular}
                  onChange={(e) => {
                    setIsCircular(e.target.checked);
                    setIsCircularManuallySet(true);
                  }}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D9D9D9] after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#284B63]" />
                <span className="ml-3 text-xs font-black text-[#353535]">
                  {isCircular ? "Sirkuler Aktif" : "Tanpa Sirkuler (Direct)"}
                </span>
              </label>
            </div>

            {/* Circular Routing Builder Component */}
            {isCircular && (
              <div className="animate-fadeIn">
                <CircularRoutingBuilder routes={routes} onChange={setRoutes} />
              </div>
            )}
          </div>

          {/* Submit Actions Button (Sesuai tulisan Batal / Kirim warna hijau di Screenshot ke-5) */}
          <div className="flex items-center justify-end gap-3 pt-5 border-t border-[#D9D9D9]">
            <Link
              href="/"
              className="px-6 py-2.5 rounded-xl font-black text-xs text-slate-600 hover:text-[#353535] bg-slate-100 hover:bg-slate-200 transition"
            >
              Batalkan
            </Link>
            <button
              type="submit"
              className="px-8 py-2.5 bg-[#2E7D32] hover:bg-green-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Kirim & Daftarkan Dokumen</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
