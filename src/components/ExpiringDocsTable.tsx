"use client";

import React, { useState } from "react";
import { usePsi } from "@/lib/psiStore";
import { Clock, AlertCircle, RefreshCw, Upload, CheckCircle2, FileText } from "lucide-react";
import UpdateTypeBadge from "@/components/UpdateTypeBadge";

export default function ExpiringDocsTable() {
  const { documents, extendValidity, reviseDocument } = usePsi();
  const [selectedDocForRevise, setSelectedDocForRevise] = useState<string | null>(null);
  const [newVersionInput, setNewVersionInput] = useState<string>("2.0");
  const [revisionNotes, setRevisionNotes] = useState<string>("");
  const [revisedFile, setRevisedFile] = useState<File | null>(null);
  const [extendNotes, setExtendNotes] = useState<string>("");
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [revisionError, setRevisionError] = useState<string | null>(null);

  // Filter documents that are expired or expiring soon (within year 2024/2025)
  const expiringDocs = documents.filter((doc) => {
    const expiryYear = new Date(doc.expiryDate).getFullYear() || 2024;
    return doc.status === "Expired" || expiryYear <= 2025;
  });

  const handleExtend = (docId: string) => {
    extendValidity(docId, extendNotes || undefined);
    setActionSuccessMsg(`Validitas dokumen diperpanjang +5 tahun! Status tercatat pada Audit Trail.`);
    setTimeout(() => setActionSuccessMsg(null), 5000);
  };

  const handleReviseSubmit = (e: React.FormEvent, docId: string) => {
    e.preventDefault();
    if (!revisedFile) {
      setRevisionError("Harap pilih berkas PDF baru untuk revisi ini.");
      return;
    }
    setRevisionError(null);
    const newFileUrl = `https://pub-r2.cloudflare.com/phorse-dms/${revisedFile.name}`;
    reviseDocument(docId, newVersionInput, newFileUrl, revisionNotes || undefined);
    setSelectedDocForRevise(null);
    setRevisedFile(null);
    setActionSuccessMsg(`File baru versi v${newVersionInput} berhasil diunggah dan diajukan!`);
    setTimeout(() => setActionSuccessMsg(null), 5000);
  };

  if (expiringDocs.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#D9D9D9] p-4">
      <div className="flex items-center justify-between pb-2.5 border-b border-[#D9D9D9] mb-3">
        <div>
          <h2 className="text-base font-bold text-[#D32F2F] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#D32F2F]" />
            <span>Dokumen Mendekati Masa Kedaluwarsa (The 5-Year Dilemma)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dokumen usia 5 tahun wajib direspons Initiator dengan 2 Opsi: <strong>Revisi File Baru</strong> (naik versi) atau <strong>Perpanjang Validitas</strong> (tanpa ubah teknis).
          </p>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-2.5 rounded-lg mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-[#D9D9D9] font-semibold text-slate-700 uppercase tracking-wider">
              <th className="py-2 px-3">No. Dokumen & Judul</th>
              <th className="py-2 px-3">Fasilitas / Lokasi</th>
              <th className="py-2 px-3">Tipe PSI</th>
              <th className="py-2 px-3">Versi</th>
              <th className="py-2 px-3">Tgl Expired</th>
              <th className="py-2 px-3">Tipe Update Terakhir</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3 text-right">Aksi Dilema 5-Tahun</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {expiringDocs.map((doc) => (
              <React.Fragment key={doc.id}>
                <tr className="hover:bg-slate-50 transition">
                  <td className="py-2 px-3">
                    <div className="font-bold text-[#284B63] flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#3C6E71]" />
                      <span>{doc.title}</span>
                    </div>
                    <div className="text-slate-500 text-[11px] font-mono">{doc.documentNumber}</div>
                  </td>
                  <td className="py-2 px-3 font-semibold text-slate-700">{doc.location}</td>
                  <td className="py-2 px-3 text-slate-600">{doc.psiType}</td>
                  <td className="py-2 px-3 font-mono font-semibold">v{doc.currentVersion}</td>
                  <td className="py-2 px-3 text-rose-600 font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{doc.expiryDate}</span>
                  </td>
                  <td className="py-2 px-3">
                    <UpdateTypeBadge history={doc.history} />
                  </td>
                  <td className="py-2 px-3">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-white font-semibold bg-[#D32F2F]">
                      {doc.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right space-x-2">
                    {/* Option 2: Extend Validity Without Changes */}
                    <button
                      onClick={() => handleExtend(doc.id)}
                      className="px-2.5 py-1 border border-[#284B63] text-[#284B63] hover:bg-blue-50 font-semibold rounded text-xs inline-flex items-center gap-1 transition"
                      title="Perpanjang 5 tahun ke depan tanpa mengunggah file baru"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Perpanjang Validitas</span>
                    </button>

                    {/* Option 1: Revise with New PDF File */}
                    <button
                      onClick={() => {
                        setSelectedDocForRevise(selectedDocForRevise === doc.id ? null : doc.id);
                        setNewVersionInput((parseFloat(doc.currentVersion) + 1).toFixed(1));
                        setRevisedFile(null);
                        setRevisionError(null);
                      }}
                      className="px-2.5 py-1 border border-[#2E7D32] text-[#2E7D32] hover:bg-emerald-50 font-semibold rounded text-xs inline-flex items-center gap-1 transition"
                      title="Wajib upload PDF baru dan menaikkan nomor versi"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Revisi File (v{ (parseFloat(doc.currentVersion) + 1).toFixed(1) })</span>
                    </button>
                  </td>
                </tr>

                {/* Revision Drawer/Form */}
                {selectedDocForRevise === doc.id && (
                  <tr className="bg-blue-50/70 border-b-2 border-blue-300">
                    <td colSpan={8} className="p-4">
                      <form onSubmit={(e) => handleReviseSubmit(e, doc.id)} className="space-y-3 max-w-2xl">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#353535] text-sm flex items-center gap-1.5">
                            <Upload className="w-4 h-4 text-[#2E7D32]" />
                            <span>Opsi 1: Revisi Dokumen & Upload File Baru</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedDocForRevise(null)}
                            className="text-slate-500 hover:text-slate-700 text-xs font-semibold"
                          >
                            Tutup [X]
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Versi Baru Dokumen:</label>
                            <input
                              type="text"
                              value={newVersionInput}
                              onChange={(e) => setNewVersionInput(e.target.value)}
                              className="w-full border border-[#D9D9D9] rounded px-2.5 py-1.5 bg-white font-mono font-bold"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Pilih File PDF Revisi Baru:</label>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx"
                              onChange={(e) => setRevisedFile(e.target.files?.[0] ?? null)}
                              required
                              className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-100 file:text-[#284B63] file:font-semibold"
                            />
                            {revisedFile && (
                              <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{revisedFile.name}</span>
                              </p>
                            )}
                          </div>
                        </div>
                        {revisionError && (
                          <p className="text-[11px] text-rose-700 font-semibold bg-rose-50 border border-rose-200 rounded px-2.5 py-1.5">{revisionError}</p>
                        )}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Catatan Perubahan (Change Notes untuk Audit Trail):</label>
                          <textarea
                            value={revisionNotes}
                            onChange={(e) => setRevisionNotes(e.target.value)}
                            placeholder="Contoh: Memperbarui diagram P&ID sesuai modifikasi fasilitas tahun 2025..."
                            className="w-full border border-[#D9D9D9] rounded p-2 bg-white text-xs h-16"
                            required
                          />
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="bg-[#2E7D32] hover:bg-green-800 text-white font-bold px-4 py-1.5 rounded shadow text-xs transition"
                          >
                            Konfirmasi Unggah & Naik Versi
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
