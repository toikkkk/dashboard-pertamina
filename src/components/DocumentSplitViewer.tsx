"use client";

import React, { useState } from "react";
import { DocumentItem, HistoryItem, getPendingApprovalStepOrder, canUserApproveDoc } from "@/lib/mockData";
import { usePsi } from "@/lib/psiStore";
import { Download, Info } from "lucide-react";
import RoutingStatusPanel from "@/components/RoutingStatusPanel";
import DocumentContentPreview, { getFileKind } from "@/components/DocumentContentPreview";
import DocumentMetadataFallback from "@/components/DocumentMetadataFallback";
import StatusTag from "@/components/StatusTag";
import { DOCUMENT_STATUS_META } from "@/lib/domain/statusStyle";

interface DocumentSplitViewerProps {
  document: DocumentItem;
}

const ACTION_LABELS: Record<HistoryItem["action"], string> = {
  Created: "Dibuat",
  Forwarded: "Diteruskan",
  Approved: "Disetujui",
  Rejected: "Ditolak",
  "Extended Validity": "Validitas Diperpanjang",
  Revised: "Direvisi",
  Closed: "Ditutup",
};

// Left-accent color per action type so a long history list can be scanned by type at a
// glance instead of having to read every entry's text (same colored-left-border pattern
// as the dashboard KPI cards).
const ACTION_COLOR: Record<HistoryItem["action"], string> = {
  Created: "#0F3B59",
  Forwarded: "#B45309",
  Approved: "#15803D",
  Rejected: "#DC2626",
  "Extended Validity": "#0891B2",
  Revised: "#6D28D9",
  Closed: "#15803D",
};

const TABS = [
  { key: "detail", label: "Detail Dokumen" },
  { key: "history", label: "Riwayat Proses" },
  { key: "attachments", label: "Lampiran Berkas", comingSoon: true },
  { key: "signature", label: "Tanda Tangan PKI", comingSoon: true },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function DocumentSplitViewer({ document: doc }: DocumentSplitViewerProps) {
  const { activeUser, approveStep, rejectStep } = usePsi();
  const [tab, setTab] = useState<TabKey>("detail");
  const [approveComment, setApproveComment] = useState("");
  const [rejectComment, setRejectComment] = useState("");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; message: string; closing?: boolean } | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const pendingStepOrder = getPendingApprovalStepOrder(doc);
  const canApprove = canUserApproveDoc(doc, activeUser);
  const meta = DOCUMENT_STATUS_META[doc.status];

  const showBanner = (tone: "success" | "error", message: string) => {
    setBanner({ tone, message });
    setTimeout(() => setBanner((b) => (b ? { ...b, closing: true } : b)), 2900);
    setTimeout(() => setBanner(null), 3100);
  };

  const handleApprove = () => {
    if (pendingStepOrder === null) return;
    approveStep(doc.id, pendingStepOrder, approveComment || undefined);
    setApproveComment("");
    showBanner("success", "Dokumen berhasil disetujui.");
  };

  const handleReject = () => {
    if (pendingStepOrder === null || !rejectComment.trim()) return;
    rejectStep(doc.id, pendingStepOrder, rejectComment);
    setRejectComment("");
    setRejectModalOpen(false);
    showBanner("error", "Dokumen ditolak dan dikembalikan ke initiator.");
  };

  const handleDownload = (item?: HistoryItem) => {
    const version = item ? item.version : doc.currentVersion;
    const fileName = item ? item.fileName : doc.fileName;
    showBanner("success", `Mengunduh berkas v${version} (${fileName ?? "berkas"}) — simulasi.`);
  };

  const toggleExpand = (id: string) => setExpandedIds((s) => ({ ...s, [id]: !s[id] }));

  return (
    <div>
      {banner && (
        <div
          className={`flex items-center gap-2.5 px-4 py-3 mb-[18px] rounded-[8px] ${banner.closing ? "animate-fadeOut" : "animate-fadeInUp"}`}
          style={{
            background: banner.tone === "error" ? "#FEE2E2" : "#DCFCE7",
            border: `1px solid ${banner.tone === "error" ? "#FECACA" : "#BBF7D0"}`,
          }}
        >
          <span className="text-[13px] font-semibold" style={{ color: banner.tone === "error" ? "#DC2626" : "#15803D" }}>{banner.message}</span>
        </div>
      )}

      {/* Header card */}
      <div className="bg-white border border-[#D8E1E4] rounded-[12px] shadow-[0_2px_6px_rgba(15,23,42,.045)] p-[22px_24px] mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="font-mono text-[12.5px] text-[#9a9da0]">{doc.documentNumber}</span>
              <StatusTag color={meta.color} label={doc.status} />
            </div>
            <h2 className="font-heading text-[23px] font-bold mb-2.5">{doc.title}</h2>
            <div className="flex gap-2 flex-wrap mb-2">
              <span className="text-[11.5px] font-semibold px-2.5 py-[3px] rounded-[8px] bg-[#eceded] text-[#3a3d40]">{doc.location}</span>
              <span className="text-[11.5px] font-semibold px-2.5 py-[3px] rounded-[8px] bg-[#eceded] text-[#3a3d40]">{doc.psiType}</span>
              <span className="text-[11.5px] font-semibold px-2.5 py-[3px] rounded-[8px] bg-[#eceded] text-[#3a3d40]">{doc.lifecyclePhase}</span>
              {doc.auditType && (
                <span className="text-[11.5px] font-semibold px-2.5 py-[3px] rounded-[8px] bg-[#EDE9FE] text-[#6D28D9]">{doc.auditType}</span>
              )}
            </div>
            <button onClick={() => setTab("history")} className="cursor-pointer text-xs font-semibold text-[#0F3B59] hover:text-[#0B2C43]">
              Lihat riwayat proses →
            </button>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            {getFileKind(doc.fileName) !== "none" ? (
              <a
                href={doc.fileUrl}
                download
                className="text-[12.5px] font-bold px-3.5 py-2 rounded-[8px] border border-[#0F3B59] bg-[#0F3B59] hover:bg-[#0B2C43] active:scale-[0.97] text-white flex items-center justify-center gap-1.5 transition"
              >
                <Download className="w-[13px] h-[13px]" strokeWidth={1.9} />
                Unduh Berkas Valid
              </a>
            ) : (
              <button
                onClick={() => handleDownload()}
                className="text-[12.5px] font-bold px-3.5 py-2 rounded-[8px] border border-[#0F3B59] bg-[#0F3B59] hover:bg-[#0B2C43] active:scale-[0.97] text-white flex items-center justify-center gap-1.5 transition"
              >
                <Download className="w-[13px] h-[13px]" strokeWidth={1.9} />
                Unduh Berkas Valid
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 items-start">
        {/* Tab rail — a horizontal scrollable row on mobile instead of the 200px
            vertical sidebar (which had nowhere to go on a narrow screen but to force
            the whole page wider), full vertical list from lg up */}
        <div className="bg-white border border-[#D8E1E4] rounded-[12px] shadow-[0_2px_6px_rgba(15,23,42,.045)] p-2 flex flex-row lg:flex-col gap-0.5 overflow-x-auto">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center justify-between gap-1.5 px-2.5 py-2.5 rounded-[8px] text-[12.5px] font-semibold text-left transition-all duration-200 ease-out-expo whitespace-nowrap flex-shrink-0 ${
                  active ? "bg-[#E2E8EB] text-[#0B2C43]" : "text-[#3a3d40] hover:bg-[#f7f7f8]"
                }`}
              >
                <span>{t.label}</span>
                {t.key === "history" && (
                  <span className="text-[10px] font-bold bg-[#eceded] text-[#3a3d40] px-1.5 py-0.5 rounded-full">{doc.history.length}</span>
                )}
                {"comingSoon" in t && t.comingSoon && (
                  <span className="text-[9px] font-bold text-[#9a9da0] uppercase tracking-[.04em]">Segera</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content — min-w-0 is load-bearing: without it, a wide real spreadsheet
            table's intrinsic width blows out this grid column (and the whole page)
            instead of scrolling inside DocumentContentPreview's own overflow-auto box. */}
        <div className="min-w-0">
          {tab === "detail" && (
            <div className="bg-white border border-[#D8E1E4] rounded-[12px] shadow-[0_2px_6px_rgba(15,23,42,.045)] p-8 animate-fadeIn">
              <DocumentContentPreview
                fileUrl={doc.fileUrl}
                fileName={doc.fileName}
                title={doc.title}
                fallback={<DocumentMetadataFallback document={doc} />}
              />
            </div>
          )}

          {tab === "history" && (
            <div className="animate-fadeIn">
              <RoutingStatusPanel doc={doc} pendingStepOrder={pendingStepOrder} />

              {canApprove && (
                <div className="bg-white border border-[#0F3B59] rounded-[8px] p-4 mb-3.5">
                  <p className="mb-2.5 text-[12.5px] font-bold text-[#3a3d40]">Aksi Persetujuan — Tahap {pendingStepOrder}</p>
                  <textarea
                    value={approveComment}
                    onChange={(e) => setApproveComment(e.target.value)}
                    placeholder="Komentar (opsional)..."
                    className="w-full min-h-[60px] px-2.5 py-2 text-[12.5px] border border-[#C5CED3] rounded-[8px] mb-2.5 resize-y"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleApprove} className="text-[12.5px] font-bold px-3.5 py-2 rounded-[8px] border border-[#15803D] bg-[#15803D] hover:bg-[#166534] active:scale-[0.97] text-white transition">
                      Setujui Dokumen
                    </button>
                    <button onClick={() => setRejectModalOpen(true)} className="text-[12.5px] font-bold px-3.5 py-2 rounded-[8px] border border-[#DC2626] bg-white text-[#DC2626] hover:bg-[#FEE2E2] active:scale-[0.97] transition">
                      Tolak &amp; Kembalikan ke Initiator
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                {[...doc.history].reverse().map((h, i) => {
                  const isExpanded = !!expandedIds[h.id];
                  return (
                    <div
                      key={h.id}
                      className="bg-white border border-[#C5CED3] border-l-[3px] rounded-[8px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_6px_rgba(15,23,42,.04)] p-[14px_16px] transition-shadow duration-300 ease-out-expo hover:shadow-[0_2px_10px_rgba(0,0,0,.05)] animate-fadeInUp"
                      style={{ borderLeftColor: ACTION_COLOR[h.action], animationDelay: `${Math.min(i * 50, 300)}ms` }}
                    >
                      <div className="flex items-start justify-between gap-2.5 flex-wrap">
                        <div>
                          <div className="text-[12.5px] font-bold text-[#3a3d40]">{ACTION_LABELS[h.action]}</div>
                          <div className="text-[11px] text-[#9a9da0] mt-0.5">{h.timestamp} · {h.actorName} ({h.actorRole}) · {h.location}</div>
                          {h.notes && <div className="text-xs text-[#3a3d40] mt-1.5">{h.notes}</div>}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {getFileKind(h.fileName) !== "none" ? (
                            <a href={h.fileUrl} download className="text-[11px] font-bold px-2.5 py-1 rounded-[8px] border border-[#C5CED3] bg-white hover:bg-[#f7f8f8] active:scale-[0.96] transition-all duration-200">
                              Unduh Berkas v{h.version}
                            </a>
                          ) : (
                            <button onClick={() => handleDownload(h)} className="text-[11px] font-bold px-2.5 py-1 rounded-[8px] border border-[#C5CED3] bg-white hover:bg-[#f7f8f8] active:scale-[0.96] transition-all duration-200">
                              Unduh Berkas v{h.version}
                            </button>
                          )}
                          <button onClick={() => toggleExpand(h.id)} className="text-[11px] font-bold px-2.5 py-1 rounded-[8px] border border-[#C5CED3] bg-white hover:bg-[#f7f8f8] active:scale-[0.96] transition-all duration-200">
                            {isExpanded ? "Tutup detail perubahan" : "Lihat detail perubahan"}
                          </button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="animate-fadeInUp">
                          <table className="w-full text-[11.5px] border-collapse mt-3 border-t border-[#eceded] pt-2">
                            <tbody>
                              <tr><td className="py-[5px] pr-2 text-[#9a9da0] w-[34%]">Aksi</td><td className="py-[5px] font-semibold">{ACTION_LABELS[h.action]}</td></tr>
                              <tr><td className="py-[5px] pr-2 text-[#9a9da0]">Versi Dokumen</td><td className="py-[5px] font-semibold">v{h.version}</td></tr>
                              <tr><td className="py-[5px] pr-2 text-[#9a9da0]">Nama Berkas</td><td className="py-[5px] font-semibold">{h.fileName ?? "-"}</td></tr>
                              <tr><td className="py-[5px] pr-2 text-[#9a9da0]">Diproses Oleh</td><td className="py-[5px] font-semibold">{h.actorName}</td></tr>
                              <tr><td className="py-[5px] pr-2 text-[#9a9da0]">Lokasi</td><td className="py-[5px] font-semibold">{h.location}</td></tr>
                            </tbody>
                          </table>

                          {h.diff && h.diff.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-[#eceded]">
                              <div className="text-[10px] font-bold tracking-[.05em] text-[#9a9da0] uppercase mb-1.5">Rincian Perubahan Field</div>
                              <div className="bg-[#F5F7F9] border border-[#eceded] rounded-[8px] px-3.5 py-3 flex flex-col gap-2.5">
                                {h.diff.map((d, i) => {
                                  const isNewField = !d.oldValue || d.oldValue === "-" || d.oldValue === "—";
                                  return (
                                    <div key={i} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-[11.5px]">
                                      <span className="text-[#3a3d40] font-bold min-w-[150px]">{d.field}</span>
                                      <span className="flex flex-wrap items-center gap-1.5">
                                        <span className="bg-[#DCFCE7] text-[#166534] font-semibold px-2 py-[3px] rounded-[14px]">{d.newValue}</span>
                                        {!isNewField && (
                                          <span className="bg-[#eceded] text-[#8a8d90] line-through px-2 py-[3px] rounded-[14px]">{d.oldValue}</span>
                                        )}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(tab === "attachments" || tab === "signature") && (
            <div className="bg-white border border-[#D8E1E4] rounded-[12px] shadow-[0_2px_6px_rgba(15,23,42,.045)] p-7 flex gap-3 items-start animate-fadeIn">
              <Info className="w-4 h-4 text-[#0F3B59] flex-shrink-0 mt-0.5" strokeWidth={1.7} />
              <p className="text-[13px] text-[#3a3d40]">
                {tab === "attachments"
                  ? "Lampiran tambahan akan tersedia pada iterasi berikutnya."
                  : "Verifikasi tanda tangan digital PKI akan diintegrasikan pada tahap selanjutnya."}
              </p>
            </div>
          )}
        </div>
      </div>

      {rejectModalOpen && (
        <div className="fixed inset-0 bg-[rgba(29,45,61,.5)] flex items-center justify-center z-[100] p-5 animate-backdropIn">
          <div className="w-[420px] max-w-full bg-white rounded-xl p-[22px] animate-modalPop">
            <h3 className="font-heading text-lg font-bold mb-3">Tolak Dokumen</h3>
            <p className="mb-2.5 text-[12.5px] text-[#6b6e72]">
              Jelaskan alasan penolakan. Dokumen akan dikembalikan ke Initiator sebagai &quot;Perlu Revisi&quot;.
            </p>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Alasan penolakan (wajib diisi)..."
              className="w-full min-h-[90px] px-2.5 py-2 text-[12.5px] border border-[#C5CED3] rounded-[8px] resize-y mb-3.5"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRejectModalOpen(false)} className="text-[12.5px] font-bold px-3.5 py-2 rounded-[8px] border border-[#C5CED3] bg-white hover:bg-[#f7f8f8] active:scale-[0.97] transition-all duration-200">
                Batal
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectComment.trim()}
                className="text-[12.5px] font-bold px-3.5 py-2 rounded-[8px] border border-[#DC2626] bg-[#DC2626] text-white active:scale-[0.97] transition"
                style={{ opacity: rejectComment.trim() ? 1 : 0.5 }}
              >
                Konfirmasi Tolak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
