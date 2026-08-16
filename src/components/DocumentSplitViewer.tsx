"use client";

import React, { useState } from "react";
import { DocumentItem, HistoryItem, getPendingApprovalStepOrder, canUserApproveDoc } from "@/lib/mockData";
import { usePsi } from "@/lib/psiStore";
import {
  FileText, CheckCircle, XCircle, ShieldCheck, Clock, Info,
  ArrowLeft, Download, ChevronDown, ChevronUp,
  FileCode, Edit3, Paperclip, Zap
} from "lucide-react";
import Link from "next/link";

interface DocumentSplitViewerProps {
  document: DocumentItem;
}

const ACTION_LABELS: Record<HistoryItem["action"], string> = {
  Created: "Dokumen Dibuat",
  Forwarded: "Diteruskan untuk Persetujuan",
  Approved: "Disetujui",
  Rejected: "Ditolak",
  "Extended Validity": "Validitas Diperpanjang",
  Revised: "Direvisi",
};

export default function DocumentSplitViewer({ document: doc }: DocumentSplitViewerProps) {
  const { activeUser, approveStep, rejectStep } = usePsi();
  const [commentInput, setCommentInput] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  const [openDetailId, setOpenDetailId] = useState<string | null>(null);
  const [activeSideTab, setActiveSideTab] = useState<string>("memproses");

  const currentActiveStepOrder = getPendingApprovalStepOrder(doc);
  const canApproveCurrentStep = canUserApproveDoc(doc, activeUser);

  const handleApprove = () => {
    if (currentActiveStepOrder === null) return;
    approveStep(doc.id, currentActiveStepOrder, commentInput || undefined);
    setCommentInput("");
    setSuccessNotice(`Persetujuan untuk Tahap ${currentActiveStepOrder} berhasil diproses dan tercatat di riwayat dokumen.`);
    setTimeout(() => setSuccessNotice(null), 6000);
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentActiveStepOrder === null || !rejectReason.trim()) return;
    rejectStep(doc.id, currentActiveStepOrder, rejectReason);
    setRejectReason("");
    setShowRejectModal(false);
    setSuccessNotice(`Dokumen ditolak dan berstatus "Revision Required" (dikembalikan ke Initiator).`);
    setTimeout(() => setSuccessNotice(null), 6000);
  };

  const handleDownloadVersion = (item: HistoryItem) => {
    setDownloadNotice(`Mengunduh v${item.version} (${item.fileUrl.split("/").pop()}) — snapshot berkas pada ${item.timestamp}...`);
    setTimeout(() => setDownloadNotice(null), 4500);
  };

  const showInfoNotice = (message: string) => {
    setInfoNotice(message);
    setTimeout(() => setInfoNotice(null), 4500);
  };

  const toggleDetail = (id: string) => {
    setOpenDetailId(openDetailId === id ? null : id);
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-3">

      {/* Top action header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#D9D9D9] shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#284B63] hover:text-blue-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-[#D9D9D9] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dasbor</span>
          </Link>
          <div className="text-xs text-slate-500 hidden md:block font-medium truncate max-w-lg">
            <span>Portal PSI & MOC</span> &nbsp;&gt;&nbsp; <strong className="text-[#353535]">{doc.documentNumber}</strong>
          </div>
        </div>

        <button
          onClick={() => setDownloadNotice(`Mengunduh arsip lengkap ${doc.title}...`)}
          className="bg-[#2E7D32] hover:bg-green-700 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Unduh Berkas Valid (v{doc.currentVersion})</span>
        </button>
      </div>

      {successNotice && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 font-semibold text-xs p-2.5 rounded-xl flex items-center gap-2 shadow-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {downloadNotice && (
        <div className="bg-blue-50 border border-blue-300 text-blue-900 font-semibold text-xs p-2.5 rounded-xl flex items-center gap-2 shadow-sm">
          <Download className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <span>{downloadNotice}</span>
        </div>
      )}

      {infoNotice && (
        <div className="bg-slate-50 border border-[#D9D9D9] text-[#353535] font-semibold text-xs p-2.5 rounded-xl flex items-center gap-2 shadow-sm">
          <Info className="w-5 h-5 text-slate-500 flex-shrink-0" />
          <span>{infoNotice}</span>
        </div>
      )}

      {/* CASE HEADER */}
      <div className="bg-white rounded-xl border border-[#D9D9D9] shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9D9D9] pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black font-mono bg-blue-50 text-[#284B63] px-2.5 py-1 rounded border border-blue-200">
              #{doc.documentNumber}
            </span>
            <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
              Modul Manajemen PSI & MOC
            </span>
            <span className={`text-[11px] font-black uppercase px-3 py-0.5 rounded-full text-white shadow-inner ${
              doc.status === "Approved" ? "bg-[#2E7D32]" :
              doc.status === "Expired" ? "bg-[#D32F2F] animate-pulse" :
              doc.status === "Revision Required" ? "bg-purple-800" : "bg-amber-600"
            }`}>
              {doc.status === "Approved" ? "DITUTUP / VALID" : doc.status.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSideTab("memproses")}
              className="px-4 py-1.5 border border-emerald-700 text-emerald-700 hover:bg-emerald-50 font-extrabold text-xs rounded-lg flex items-center gap-1.5 transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Tinjau Dokumen</span>
            </button>
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-[#284B63] tracking-tight leading-tight">
          {doc.title}
        </h1>

        <div className="bg-slate-50 p-3 rounded-xl border border-[#D9D9D9] text-xs text-slate-600 leading-relaxed font-medium">
          <span>Regional Jatimbalinus - <strong className="text-[#353535]">{doc.location}</strong></span> &nbsp;|&nbsp;
          <span>Jenis PSI: <strong className="text-[#284B63]">{doc.psiType}</strong></span> &nbsp;|&nbsp;
          <span>Fase Siklus Hidup: <strong className="text-[#353535]">{doc.lifecyclePhase}</strong></span> &nbsp;|&nbsp;
          <button onClick={() => setActiveSideTab("memproses")} className="text-[#3C6E71] font-extrabold hover:underline inline-flex items-center gap-1 ml-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Lihat riwayat proses</span>
          </button>
        </div>
      </div>

      {/* SIDEBAR + MAIN CONTENT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

        {/* LEFT TABS NAVIGATION */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-[#D9D9D9] p-2 shadow-sm space-y-1">
          <div className="px-2.5 py-1.5 text-[11px] font-black uppercase text-slate-400 tracking-wider">
            Menu Kasus
          </div>

          <button
            onClick={() => setActiveSideTab("document")}
            className={`w-full text-left px-3 py-2 rounded-lg font-bold text-xs flex items-center justify-between transition ${
              activeSideTab === "document" ? "bg-[#284B63] text-white shadow" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Detail Dokumen</span>
            </span>
          </button>

          <button
            onClick={() => setActiveSideTab("memproses")}
            className={`w-full text-left px-3 py-2 rounded-lg font-bold text-xs flex items-center justify-between transition ${
              activeSideTab === "memproses" ? "bg-[#284B63] text-white shadow" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Riwayat Proses</span>
            </span>
            <span className="px-2 py-0.2 bg-emerald-600 text-white rounded text-[10px] font-black font-mono">
              {doc.history.length}
            </span>
          </button>

          <button
            onClick={() => showInfoNotice("Lampiran data dukung (HAZID, P&ID, dsb) untuk dokumen ini.")}
            className="w-full text-left px-3 py-2 rounded-lg font-bold text-xs text-slate-700 hover:bg-slate-100 flex items-center justify-between transition"
          >
            <span className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-slate-500" />
              <span>Lampiran Berkas</span>
            </span>
          </button>

          <button
            onClick={() => showInfoNotice("Tanda tangan digital resmi (PKI) terverifikasi untuk dokumen ini.")}
            className="w-full text-left px-3 py-2 rounded-lg font-bold text-xs text-slate-700 hover:bg-slate-100 flex items-center justify-between transition"
          >
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Tanda Tangan (PKI)</span>
            </span>
          </button>

          <div className="pt-2 border-t border-[#D9D9D9] mt-2">
            <div className="p-3 bg-blue-50/60 rounded-xl text-[11px] text-[#284B63] space-y-1">
              <strong className="font-extrabold block">Fungsi yang bertanggung jawab:</strong>
              <span className="block text-slate-600 font-sans leading-relaxed">HSSE Regional Jatimbalinus — {doc.location}</span>
            </div>
          </div>
        </div>

        {/* RIGHT CONTENT PANEL */}
        <div className="lg:col-span-9 space-y-4">

          {/* TAB VIEW 1: Detail Dokumen */}
          {activeSideTab === "document" && (
            <div className="bg-white rounded-xl border border-[#D9D9D9] shadow-sm flex flex-col overflow-hidden animate-fadeIn">
              <div className="bg-slate-800 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-700">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <span className="font-extrabold text-sm truncate">Preview Berkas: {doc.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-slate-700 px-2.5 py-1 rounded text-slate-200 font-bold">
                    v{doc.currentVersion}
                  </span>
                  <button
                    onClick={() => setActiveSideTab("memproses")}
                    className="bg-[#3C6E71] hover:bg-[#2F5659] text-white text-xs px-3 py-1 rounded font-bold transition"
                  >
                    Lihat Riwayat Proses &rarr;
                  </button>
                </div>
              </div>

              {/* PDF Preview Panel */}
              <div className="bg-slate-200 p-4 flex items-center justify-center min-h-[480px]">
                <div className="bg-white w-full max-w-2xl min-h-[460px] shadow-xl border border-[#D9D9D9] p-6 flex flex-col justify-between text-[#353535] font-serif relative rounded">
                  <div className="border-b-2 border-slate-800 pb-3 mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-xl uppercase tracking-wider text-[#284B63] font-sans">PT PERTAMINA (PERSERO)</h3>
                      <p className="text-xs font-sans text-slate-600 font-bold">DIREKTORAT LOGISTIK & INFRASTRUKTUR — REGIONAL JATIMBALINUS</p>
                    </div>
                    <div className="text-right font-sans text-xs">
                      <p className="font-mono font-black text-[#D32F2F] text-sm">#{doc.documentNumber}</p>
                      <p>Terminal: <strong>{doc.location}</strong></p>
                    </div>
                  </div>

                  <div className="space-y-4 my-auto font-sans">
                    <div className="text-center py-3.5 bg-slate-50 border border-[#D9D9D9] rounded-lg">
                      <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Dokumen Process Safety Information</span>
                      <h2 className="text-xl font-black text-[#353535]">{doc.title}</h2>
                    </div>
                    <div className="text-xs space-y-2 text-slate-700 leading-relaxed border-t border-b border-[#D9D9D9] py-3 bg-slate-50/50 px-3 rounded">
                      <p><strong>Tipe Kasus / PSI:</strong> {doc.psiType}</p>
                      <p><strong>Fase Lifecycle:</strong> {doc.lifecyclePhase}</p>
                      <p><strong>Tanggal Terbit / Update:</strong> <span className="font-mono font-bold text-[#284B63]">{doc.issueDate}</span> &nbsp;|&nbsp; <strong>Batas Kedaluwarsa:</strong> <span className="font-mono font-bold text-rose-700">{doc.expiryDate}</span></p>
                      <p><strong>Nama Berkas:</strong> <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">{doc.fileUrl.split("/").pop()}</code></p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#D9D9D9] flex justify-between items-end font-sans text-xs text-slate-500">
                    <div>
                      <p>Status Dokumen: <strong className="text-[#353535] font-extrabold uppercase bg-slate-200 px-2 py-0.5 rounded">{doc.status}</strong></p>
                      <p className="mt-1 text-[11px]">Sistem Pengendalian Dokumen PSI & MOC</p>
                    </div>
                    <div className="border-2 border-slate-800 px-3 py-1.5 text-center rounded bg-slate-50 shadow-inner">
                      <span className="text-[10px] uppercase font-black text-slate-700 block">Cap Tanda Tangan Digital</span>
                      <span className="font-black text-[#284B63] font-mono text-xs">TERVERIFIKASI-PKI</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB VIEW 2: RIWAYAT PROSES */}
          {activeSideTab === "memproses" && (
            <div className="bg-white rounded-xl border border-[#D9D9D9] shadow-sm p-4 sm:p-5 space-y-4 animate-fadeIn">

              <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-3">
                <div>
                  <h2 className="text-lg font-black text-[#284B63] flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-emerald-600" />
                    <span>Riwayat Proses Dokumen</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mencatat seluruh riwayat persetujuan sirkuler dan perubahan dokumen.
                  </p>
                </div>

                {canApproveCurrentStep && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full font-black text-xs flex items-center gap-1.5 animate-pulse">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Menunggu Persetujuan Anda (Tahap {currentActiveStepOrder})</span>
                  </span>
                )}
              </div>

              {/* Approver Action Block */}
              {canApproveCurrentStep && (
                <div className="bg-amber-50 p-3.5 rounded-xl border-2 border-amber-300 shadow-md space-y-2.5">
                  <div className="font-black text-amber-950 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-700" />
                    <span>Tindak Lanjut Persetujuan Sirkuler (Tahap {currentActiveStepOrder}):</span>
                  </div>
                  <p className="text-xs text-amber-800">
                    Sebagai <strong>{activeUser.role}</strong> di <strong>{activeUser.location}</strong>, silakan berikan catatan tinjauan sebelum menyetujui atau meminta revisi.
                  </p>
                  <input
                    type="text"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Masukkan catatan tinjau / review teknis..."
                    className="w-full text-xs p-3 rounded-xl border border-amber-400 bg-white focus:outline-none focus:ring-2 focus:ring-amber-600 font-medium"
                  />
                  <div className="flex items-center justify-end gap-3 pt-1">
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="px-4 py-2 bg-[#D32F2F] hover:bg-red-800 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow transition active:scale-95"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Tolak & Kembalikan ke Initiator</span>
                    </button>
                    <button
                      onClick={handleApprove}
                      className="px-6 py-2 bg-[#2E7D32] hover:bg-green-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow transition active:scale-95"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Setujui Dokumen (Approve)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TIMELINE */}
              <div className="space-y-2.5 pt-1">
                {[...doc.history].reverse().map((item) => {
                  const isExpanded = openDetailId === item.id;

                  return (
                    <div key={item.id} className={`p-3.5 rounded-xl border transition-all ${
                      isExpanded ? "bg-slate-50 border-blue-300 shadow-md" : "bg-white border-[#D9D9D9] hover:border-[#D9D9D9] shadow-sm"
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div>
                          <span className="text-sm font-black text-[#353535] block tracking-tight">
                            {ACTION_LABELS[item.action]} &nbsp; <span className="font-medium text-xs text-slate-500">• &nbsp; {item.timestamp} &nbsp; | &nbsp; {item.actorName} ({item.actorRole})</span>
                          </span>
                          <span className="text-xs text-slate-500 block mt-0.5 font-medium">
                            Lokasi Otorisasi: <strong>{item.location}</strong>
                          </span>
                        </div>

                        <button
                          onClick={() => handleDownloadVersion(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#284B63] text-[#284B63] hover:bg-blue-50 font-extrabold text-[11px] transition"
                          title="Unduh file saat riwayat versi ini"
                        >
                          <Download className="w-3.5 h-3.5 text-[#284B63]" />
                          <span>Unduh Berkas v{item.version}</span>
                        </button>
                      </div>

                      {item.notes && (
                        <p className="text-xs font-semibold text-slate-700 mt-2.5 bg-white p-2.5 rounded-xl border border-[#D9D9D9]/80 shadow-inner">
                          <strong className="text-[#284B63]">Catatan: </strong> {item.notes}
                        </p>
                      )}

                      <div className="mt-3.5 pt-3 border-t border-[#D9D9D9]">
                        <button
                          onClick={() => toggleDetail(item.id)}
                          className="inline-flex items-center gap-1 text-[#3C6E71] font-black hover:underline text-xs group"
                        >
                          <span>{isExpanded ? "Tutup detail perubahan" : "Lihat detail perubahan"}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 ml-0.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 ml-0.5" />
                          )}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 bg-white p-3.5 rounded-xl border-2 border-blue-200/80 shadow-inner space-y-2.5 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-2.5 gap-x-6 text-slate-700 font-medium">
                            <div className="text-slate-500 font-bold">Aksi</div>
                            <div className="sm:col-span-2">{ACTION_LABELS[item.action]}</div>

                            <div className="text-slate-500 font-bold">Versi Dokumen</div>
                            <div className="sm:col-span-2 font-mono font-bold text-[#284B63]">v{item.version}</div>

                            <div className="text-slate-500 font-bold">Nama Berkas</div>
                            <div className="sm:col-span-2 font-mono">{item.fileUrl.split("/").pop()}</div>

                            <div className="text-slate-500 font-bold">Diproses Oleh</div>
                            <div className="sm:col-span-2">{item.actorName} — {item.actorRole}</div>

                            <div className="text-slate-500 font-bold">Lokasi</div>
                            <div className="sm:col-span-2">{item.location}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          )}

        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border-t-8 border-[#D32F2F] space-y-3">
            <div className="flex items-center gap-2.5 text-[#D32F2F]">
              <XCircle className="w-7 h-7" />
              <h3 className="font-black text-xl text-[#353535]">Tolak & Minta Revisi Initiator</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dokumen akan diubah statusnya menjadi <strong>Revision Required</strong> dan langsung dikembalikan kepada Initiator di fasilitas <strong>{doc.location}</strong>.
            </p>
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#353535] mb-1">Alasan Penolakan / Instruksi Revisi:</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Contoh: Hasil HAZOP terbaru untuk tangki belum terlampir..."
                  className="w-full text-xs p-3 rounded-xl border border-[#D9D9D9] h-28 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#D32F2F] font-medium"
                  required
                />
              </div>
              <div className="flex justify-end gap-2.5 text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-[#353535] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-[#D32F2F] hover:bg-red-800 text-white font-extrabold px-5 py-2 rounded-lg shadow-md transition"
                >
                  Konfirmasi Kembalikan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
