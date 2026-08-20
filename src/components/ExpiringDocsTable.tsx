"use client";

import React, { useState } from "react";
import { usePsi } from "@/lib/psiStore";
import { CheckCircle2, Upload as UploadIcon, RefreshCw } from "lucide-react";
import UpdateTypeBadge from "@/components/UpdateTypeBadge";
import { isDocOverdue } from "@/lib/mockData";
import { uploadFileToR2 } from "@/lib/uploadFile";

const STATUS_META: Record<string, { color: string; tint: string }> = {
  Approved: { color: "#15803D", tint: "#DCFCE7" },
  "In Routing": { color: "#B45309", tint: "#FEF3C7" },
  "Revision Required": { color: "#6D28D9", tint: "#EDE9FE" },
  Expired: { color: "#DC2626", tint: "#FEE2E2" },
};

function fmtDate(iso: string) {
  if (!iso) return "-";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ExpiringDocsTable() {
  const { documents, extendValidity, reviseDocument } = usePsi();
  const [selectedDocForRevise, setSelectedDocForRevise] = useState<string | null>(null);
  const [newVersionInput, setNewVersionInput] = useState<string>("");
  const [revisionNotes, setRevisionNotes] = useState<string>("");
  const [revisedFile, setRevisedFile] = useState<File | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<{ text: string; closing?: boolean } | null>(null);
  const [revisionError, setRevisionError] = useState<string | null>(null);
  const [revising, setRevising] = useState(false);

  const expiringDocs = documents.filter(isDocOverdue);

  const flashSuccess = (text: string) => {
    setActionSuccessMsg({ text });
    setTimeout(() => setActionSuccessMsg((m) => (m ? { ...m, closing: true } : m)), 4700);
    setTimeout(() => setActionSuccessMsg(null), 4900);
  };

  const handleExtend = (docId: string) => {
    extendValidity(docId);
    flashSuccess("Validitas dokumen berhasil diperpanjang 5 tahun.");
  };

  const openRevise = (docId: string, suggestedVersion: string) => {
    setSelectedDocForRevise(selectedDocForRevise === docId ? null : docId);
    setNewVersionInput(suggestedVersion);
    setRevisedFile(null);
    setRevisionError(null);
  };

  const handleReviseSubmit = async (e: React.FormEvent, docId: string, suggestedVersion: string) => {
    e.preventDefault();
    if (!revisedFile || !revisionNotes.trim()) {
      setRevisionError("Berkas baru dan catatan perubahan wajib diisi.");
      return;
    }
    setRevisionError(null);
    const version = newVersionInput.trim() || suggestedVersion;

    setRevising(true);
    try {
      const fileId = await uploadFileToR2(revisedFile);
      await reviseDocument(docId, version, fileId, revisionNotes);
      setSelectedDocForRevise(null);
      setRevisedFile(null);
      setRevisionNotes("");
      flashSuccess(`Dokumen berhasil direvisi ke versi ${version}.`);
    } catch (err) {
      setRevisionError(err instanceof Error ? err.message : "Gagal menyimpan revisi.");
    } finally {
      setRevising(false);
    }
  };

  if (expiringDocs.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-[#D6DEE8] rounded-[2px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_6px_rgba(15,23,42,.04)] overflow-hidden">
      {actionSuccessMsg && (
        <div
          className={`px-4 py-2.5 bg-[#DCFCE7] border-b border-[#BBF7D0] text-[12.5px] font-semibold text-[#15803D] flex items-center gap-2 ${
            actionSuccessMsg.closing ? "animate-fadeOut" : "animate-fadeInUp"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{actionSuccessMsg.text}</span>
        </div>
      )}

      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr className="bg-[#fafafb]">
            <th className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">No. Kasus</th>
            <th className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">Judul</th>
            <th className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">Lokasi</th>
            <th className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">Expired</th>
            <th className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">Status</th>
            <th className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">Aksi Dilema 5-Tahun</th>
          </tr>
        </thead>
        <tbody>
          {expiringDocs.map((doc, i) => {
            // Every row here is overdue by definition (that's the filter above) — show
            // "Expired" consistently rather than a stale stored status like "Approved"
            // that was only ever accurate before its expiryDate passed.
            const meta = STATUS_META.Expired;
            const vNum = parseFloat(doc.currentVersion) || 1;
            const suggestedVersion = (vNum + 1).toFixed(1);
            const isRevising = selectedDocForRevise === doc.id;
            return (
              <React.Fragment key={doc.id}>
                <tr className="border-t border-[#f0f0f1] hover:bg-[#fafafb] hover:shadow-[inset_3px_0_0_#0369A1] transition-all duration-200 ease-out-expo animate-fadeInUp" style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>
                  <td className="px-3.5 py-3 text-[#6b6e72] font-heading text-xs">{doc.documentNumber}</td>
                  <td className="px-3.5 py-3 font-semibold max-w-[220px]">
                    {doc.title}
                    <div className="mt-0.5"><UpdateTypeBadge history={doc.history} /></div>
                  </td>
                  <td className="px-3.5 py-3">{doc.location}</td>
                  <td className="px-3.5 py-3">{fmtDate(doc.expiryDate)}</td>
                  <td className="px-3.5 py-3">
                    <span className="inline-flex items-center gap-[5px] text-[11px] font-bold px-2 py-[3px] rounded-[2px]" style={{ background: meta.tint, color: meta.color }}>
                      Expired
                    </span>
                  </td>
                  <td className="px-3.5 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExtend(doc.id)}
                        className="text-[11.5px] font-bold px-2.5 py-1.5 rounded-[2px] border border-[#D6DEE8] bg-white hover:bg-[#f7f8f8] active:scale-[0.97] flex items-center gap-1.5 transition"
                      >
                        <RefreshCw className="w-3 h-3 text-[#3a3d40]" strokeWidth={1.8} />
                        Perpanjang Validitas
                      </button>
                      <button
                        onClick={() => openRevise(doc.id, suggestedVersion)}
                        className="text-[11.5px] font-bold px-2.5 py-1.5 rounded-[2px] border border-[#0369A1] bg-[#0369A1] hover:bg-[#075985] active:scale-[0.97] text-white flex items-center gap-1.5 transition"
                      >
                        <UploadIcon className="w-3 h-3" strokeWidth={1.8} />
                        Revisi File
                      </button>
                    </div>
                  </td>
                </tr>

                {isRevising && (
                  <tr>
                    <td colSpan={6} className="p-0 border-t border-[#f0f0f1]">
                      <div className="bg-[#f7f8f8] px-5 py-[18px] animate-fadeInUp">
                        <p className="mb-3 text-[12.5px] font-bold text-[#3a3d40]">Revisi File — {doc.title}</p>
                        <form onSubmit={(e) => handleReviseSubmit(e, doc.id, suggestedVersion)}>
                          <div className="grid grid-cols-3 gap-3.5 mb-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-[#6b6e72] mb-[5px]">Versi Baru</label>
                              <input
                                type="text"
                                placeholder={suggestedVersion}
                                value={newVersionInput}
                                onChange={(e) => setNewVersionInput(e.target.value)}
                                className="w-full min-h-[34px] px-2.5 py-1 text-[12.5px] border border-[#D6DEE8] rounded-[2px]"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-[#6b6e72] mb-[5px]">Berkas Baru</label>
                              <input
                                id={`reviseFileInput-${doc.id}`}
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => setRevisedFile(e.target.files?.[0] ?? null)}
                                className="hidden"
                              />
                              <label
                                htmlFor={`reviseFileInput-${doc.id}`}
                                className="flex items-center gap-1.5 min-h-[34px] px-2.5 py-1 text-xs border border-[#D6DEE8] rounded-[2px] bg-white cursor-pointer transition-colors duration-200 hover:bg-[#f7f8f8] hover:border-[#9a9da0]"
                                style={{ color: revisedFile ? "#0F172A" : "#9a9da0" }}
                              >
                                <UploadIcon className="w-[13px] h-[13px] text-[#6b6e72]" strokeWidth={1.7} />
                                {revisedFile ? revisedFile.name : "Pilih Berkas"}
                              </label>
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-[#6b6e72] mb-[5px]">Catatan Perubahan</label>
                              <input
                                type="text"
                                placeholder="Ringkas perubahan..."
                                value={revisionNotes}
                                onChange={(e) => setRevisionNotes(e.target.value)}
                                className="w-full min-h-[34px] px-2.5 py-1 text-[12.5px] border border-[#D6DEE8] rounded-[2px]"
                              />
                            </div>
                          </div>
                          {revisionError && <p className="mb-2.5 text-[11.5px] font-semibold text-[#DC2626]">{revisionError}</p>}
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={revising}
                              className="text-xs font-bold px-3.5 py-2 rounded-[2px] border border-[#0369A1] bg-[#0369A1] hover:bg-[#075985] active:scale-[0.97] text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
                            >
                              {revising ? "Mengunggah…" : "Simpan Revisi"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedDocForRevise(null)}
                              disabled={revising}
                              className="text-xs font-bold px-3.5 py-2 rounded-[2px] border border-[#D6DEE8] bg-white hover:bg-[#f0f0f1] active:scale-[0.97] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              Batal
                            </button>
                          </div>
                        </form>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
