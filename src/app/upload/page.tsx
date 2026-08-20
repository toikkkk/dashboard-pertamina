"use client";

import React, { useState, useEffect } from "react";
import { usePsi } from "@/lib/psiStore";
import { useRouter } from "next/navigation";
import CircularRoutingBuilder from "@/components/CircularRoutingBuilder";
import { ApprovalRouteItem, PSIType, LifecyclePhase, PSI_TYPE_REQUIRES_CIRCULAR, AuditType, AUDIT_TYPES } from "@/lib/mockData";
import { uploadFileToR2 } from "@/lib/uploadFile";
import { Upload as UploadIcon, ChevronDown, X, CheckCircle2 } from "lucide-react";

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
  const [auditType, setAuditType] = useState<AuditType | "">("");
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [lifecyclePhase] = useState<LifecyclePhase>("Operasi");
  const [file, setFile] = useState<File | null>(null);
  const [isCircular, setIsCircular] = useState(true);
  const [isCircularManuallySet, setIsCircularManuallySet] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; file?: string; routes?: string }>({});
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [routes, setRoutes] = useState<ApprovalRouteItem[]>([]);

  useEffect(() => {
    if (!isCircularManuallySet && psiType) {
      setIsCircular(PSI_TYPE_REQUIRES_CIRCULAR[psiType]);
    }
  }, [psiType, isCircularManuallySet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const nextErrors: { title?: string; file?: string; routes?: string } = {};
    if (!title.trim()) nextErrors.title = "Judul dokumen wajib diisi.";
    if (!file) nextErrors.file = "Berkas wajib diunggah.";
    // Bug nyata: dokumen isCircular=true dengan routes kosong tersimpan berstatus "In
    // Routing" tapi getPendingApprovalStepOrder() selalu null untuk routes kosong, jadi
    // canUserApproveDoc() menolak semua orang (termasuk Controller/Admin Regional) —
    // dokumen macet permanen, tidak pernah bisa disetujui/ditolak siapapun.
    if (isCircular && routes.length === 0) {
      nextErrors.routes = "Sirkuler aktif — tambahkan minimal satu approver sebelum mengajukan, atau matikan Sirkuler Persetujuan.";
    }
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
        auditType: auditType || undefined,
        location,
        lifecyclePhase,
        isCircular,
        routes: isCircular ? routes : [],
        fileId,
        expiryDate,
      });

      setSuccessNotice("Dokumen berhasil diajukan. Mengalihkan ke Dashboard…");
      setTimeout(() => router.push("/"), 1200);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Gagal mengajukan dokumen.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="bg-white border border-[#D6DEE8] rounded-[2px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_6px_rgba(15,23,42,.04)] p-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-[#3a3d40] mb-[5px]">Tanggal dan Waktu</label>
            <input
              type="datetime-local"
              value={dateAndTimestamp}
              onChange={(e) => setDateAndTimestamp(e.target.value)}
              className="w-full min-h-[36px] px-2.5 py-1 text-[13px] border border-[#D6DEE8] rounded-[2px]"
            />
            <p className="mt-1 text-[10.5px] text-[#9a9da0]">Tanggal terbit resmi akan tercatat otomatis oleh sistem saat disimpan.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#3a3d40] mb-[5px]">Lokasi Operasional</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={!activeUser.isRegionalAdmin}
              className="w-full min-h-[36px] px-2.5 py-1 text-[13px] border border-[#D6DEE8] rounded-[2px]"
              style={{ background: activeUser.isRegionalAdmin ? "#fff" : "#F8FAFC" }}
            >
              {(activeUser.isRegionalAdmin ? locations.map((l) => l.locationName) : [activeUser.location ?? locations[0].locationName]).map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-[#3a3d40] mb-[5px]">Fungsi yang Bertanggung Jawab</label>
          <input
            type="text"
            value={responsibleFunction}
            onChange={(e) => setResponsibleFunction(e.target.value)}
            placeholder="mis. Fungsi HSE FT Malang"
            className="w-full min-h-[36px] px-2.5 py-1 text-[13px] border border-[#D6DEE8] rounded-[2px]"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-[#3a3d40] mb-[5px]">Judul Dokumen <span className="text-[#DC2626]">*</span></label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="mis. Informasi Bahan Berbahaya Tangki T-102"
            className="w-full min-h-[36px] px-2.5 py-1 text-[13px] rounded-[2px]"
            style={{ border: `1px solid ${errors.title ? "#DC2626" : "#D6DEE8"}` }}
          />
          {errors.title && <p className="mt-1 text-[11px] text-[#DC2626]">{errors.title}</p>}
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-[#3a3d40] mb-[5px]">Location Description</label>
          <textarea
            value={locationDescription}
            onChange={(e) => setLocationDescription(e.target.value)}
            placeholder="Deskripsi lokasi fisik / unit terkait..."
            className="w-full min-h-[70px] px-2.5 py-2 text-[13px] border border-[#D6DEE8] rounded-[2px] resize-y"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-[#3a3d40] mb-[5px]">Jenis PSI <span className="text-[#DC2626]">*</span></label>
            <button
              type="button"
              onClick={() => setShowTypeModal(true)}
              className="w-full min-h-[36px] px-3 py-1 text-[13px] border border-[#D6DEE8] rounded-[2px] bg-white flex items-center justify-between text-left transition-colors duration-200 hover:border-[#9a9da0]"
            >
              <span style={{ color: psiType ? "#0F172A" : "#9a9da0" }}>{psiType ?? "Pilih jenis PSI..."}</span>
              <ChevronDown className="w-[13px] h-[13px] text-[#9a9da0]" strokeWidth={2} />
            </button>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#3a3d40] mb-[5px]">Tipe Audit</label>
            <select
              value={auditType}
              onChange={(e) => setAuditType(e.target.value as AuditType | "")}
              className="w-full min-h-[36px] px-2.5 py-1 text-[13px] border border-[#D6DEE8] rounded-[2px] bg-white"
            >
              <option value="">Tidak ditentukan</option>
              {AUDIT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-semibold text-[#3a3d40] mb-[5px]">Upload Berkas <span className="text-[#DC2626]">*</span></label>
          <input id="mainFileInput" type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
          <label
            htmlFor="mainFileInput"
            className="flex items-center gap-[7px] min-h-[36px] px-3 py-1 text-[12.5px] rounded-[2px] bg-white cursor-pointer w-full transition-colors duration-200 hover:bg-[#f7f8f8]"
            style={{ border: `1px solid ${errors.file ? "#DC2626" : "#D6DEE8"}`, color: file ? "#0F172A" : "#9a9da0" }}
          >
            <UploadIcon className="w-[14px] h-[14px] text-[#6b6e72]" strokeWidth={1.7} />
            {file ? file.name : "Pilih Berkas"}
          </label>
          <p className="mt-1 text-[10.5px] text-[#9a9da0]">Format PDF/DOC, maksimum 25MB.</p>
          {errors.file && <p className="mt-1 text-[11px] text-[#DC2626]">{errors.file}</p>}
        </div>

        <div className="flex items-center justify-between px-4 py-3.5 bg-[#f7f8f8] border border-[#eceded] rounded-[2px] mb-4">
          <div>
            <div className="text-[12.5px] font-bold text-[#3a3d40]">Sirkuler Persetujuan</div>
            <div className="text-[11px] text-[#9a9da0]">Otomatis disarankan berdasarkan Jenis PSI, dapat diubah manual.</div>
          </div>
          <div
            onClick={() => {
              setIsCircular((v) => !v);
              setIsCircularManuallySet(true);
            }}
            className="w-10 h-[22px] rounded-full relative cursor-pointer flex-shrink-0 transition-colors duration-200 active:scale-95"
            style={{ background: isCircular ? "#0369A1" : "#D6DEE8" }}
          >
            <div className="w-4 h-4 rounded-full bg-white absolute top-[3px] transition-all duration-200 ease-out-expo shadow-[0_1px_3px_rgba(0,0,0,.3)]" style={{ left: isCircular ? 21 : 3 }} />
          </div>
        </div>

        {isCircular && (
          <div className="mb-5 animate-fadeInUp">
            <CircularRoutingBuilder
              routes={routes}
              onChange={(next) => {
                setRoutes(next);
                if (next.length > 0) setErrors((prev) => ({ ...prev, routes: undefined }));
              }}
              error={errors.routes}
            />
          </div>
        )}

        {successNotice && (
          <div className="mb-3.5 px-4 py-2.5 bg-[#DCFCE7] border border-[#BBF7D0] rounded-[2px] text-[12.5px] font-semibold text-[#15803D] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {submitError && (
          <div className="mb-3.5 px-4 py-2.5 bg-[#FEE2E2] border border-[#FECACA] rounded-[2px] text-[12.5px] font-semibold text-[#DC2626]">
            {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="min-h-[44px] px-6 font-heading font-bold text-[14.5px] bg-[#0369A1] hover:bg-[#075985] active:scale-[0.97] text-white rounded-[2px] transition disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {submitting ? "Mengunggah…" : "Ajukan Dokumen"}
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
                      setIsCircularManuallySet(false);
                      setShowTypeModal(false);
                    }}
                    className="p-3.5 rounded-[2px] cursor-pointer transition active:scale-[0.97] hover:shadow-[0_2px_8px_rgba(0,0,0,.06)]"
                    style={{ border: `1px solid ${selected ? "#0369A1" : "#D6DEE8"}`, background: selected ? "#E0F2FE" : "#fff" }}
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
