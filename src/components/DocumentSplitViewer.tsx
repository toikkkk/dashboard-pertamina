"use client";

import React, { useState } from "react";
import { DocumentItem, HistoryItem } from "@/lib/mockData";
import { Download } from "lucide-react";
import DocumentContentPreview, { getFileKind } from "@/components/DocumentContentPreview";
import DocumentMetadataFallback from "@/components/DocumentMetadataFallback";
import StatusTag from "@/components/StatusTag";
import { DOCUMENT_STATUS_META } from "@/lib/domain/statusStyle";
import { usePsi } from "@/lib/psiStore";

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
] as const;

type TabKey = (typeof TABS)[number]["key"];

type HistoryEditForm = { timestamp: string; actorName: string; actorRole: string; notes: string };

export default function DocumentSplitViewer({ document: doc }: DocumentSplitViewerProps) {
  const { activeUser, updateHistoryItem } = usePsi();
  const [tab, setTab] = useState<TabKey>("detail");
  const [banner, setBanner] = useState<{ tone: "success" | "error"; message: string; closing?: boolean } | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<HistoryEditForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const meta = DOCUMENT_STATUS_META[doc.status];

  const showBanner = (tone: "success" | "error", message: string) => {
    setBanner({ tone, message });
    setTimeout(() => setBanner((b) => (b ? { ...b, closing: true } : b)), 2900);
    setTimeout(() => setBanner(null), 3100);
  };

  const handleDownload = (item?: HistoryItem) => {
    const version = item ? item.version : doc.currentVersion;
    const fileName = item ? item.fileName : doc.fileName;
    showBanner("success", `Mengunduh berkas v${version} (${fileName ?? "berkas"}) — simulasi.`);
  };

  const toggleExpand = (id: string) => setExpandedIds((s) => ({ ...s, [id]: !s[id] }));

  const startEdit = (h: HistoryItem) => {
    setEditingId(h.id);
    setEditForm({
      timestamp: h.timestamp.replace(" ", "T"),
      actorName: h.actorName,
      actorRole: h.actorRole,
      notes: h.notes ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEdit = async (historyId: string) => {
    if (!editForm) return;
    setSavingEdit(true);
    try {
      await updateHistoryItem(doc.id, historyId, {
        timestamp: editForm.timestamp,
        actorName: editForm.actorName,
        actorRole: editForm.actorRole,
        notes: editForm.notes,
      });
      showBanner("success", "Riwayat proses berhasil diperbarui.");
      setEditingId(null);
      setEditForm(null);
    } catch (e) {
      showBanner("error", e instanceof Error ? e.message : "Gagal memperbarui riwayat proses.");
    } finally {
      setSavingEdit(false);
    }
  };

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

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 items-stretch">
        {/* Tab rail — a horizontal scrollable row on mobile instead of the 200px
            vertical sidebar (which had nowhere to go on a narrow screen but to force
            the whole page wider), full vertical list from lg up. items-stretch
            (was items-start) so this card's height matches the content column
            instead of being a short floating box beside a much taller one — most
            visible when the content side is a tall PDF viewer next to a 2-tab nav
            (flagged directly by a user screenshot, 2026-10-01). */}
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
              {/* Panel "Status Sirkuler Persetujuan" + tombol Setujui/Tolak SENGAJA
                  dihapus dari sini (2026-10-01) — PSI sudah tidak punya konsep alur
                  persetujuan sama sekali (itu sekarang murni milik MOC), jadi
                  menampilkannya di dokumen PSI cuma menyesatkan walau datanya masih
                  ada di dokumen lama. Riwayat kronologis polos di bawah ini sudah
                  cukup dan tetap menyimpan fakta historisnya (termasuk entri
                  Approved/Rejected lama, kalau ada). Konsekuensi yang disadari: enam
                  dokumen PSI lama yang masih berstatus "In Routing"/"Revision
                  Required" jadi tidak bisa diproses lagi lewat UI ini — sudah
                  dikonfirmasi ke pengguna, bukan terlewat. */}
              <div className="flex flex-col gap-2.5">
                {[...doc.history].reverse().map((h, i) => {
                  const isExpanded = !!expandedIds[h.id];
                  return (
                    <div
                      key={h.id}
                      className="bg-white border border-[#C5CED3] border-l-[3px] rounded-[8px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_6px_rgba(15,23,42,.04)] p-[14px_16px] transition-shadow duration-300 ease-out-expo hover:shadow-[0_2px_10px_rgba(0,0,0,.05)] animate-fadeInUp"
                      style={{ borderLeftColor: ACTION_COLOR[h.action], animationDelay: `${Math.min(i * 50, 300)}ms` }}
                    >
                      {editingId === h.id && editForm ? (
                        <div className="flex flex-col gap-2.5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#3a3d40]">
                              Tanggal &amp; Waktu
                              <input
                                type="datetime-local"
                                value={editForm.timestamp}
                                onChange={(e) => setEditForm((f) => (f ? { ...f, timestamp: e.target.value } : f))}
                                className="text-[12.5px] px-2.5 py-1.5 rounded-[8px] border border-[#C5CED3] focus:outline-none focus:border-[#0F3B59]"
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#3a3d40]">
                              Nama Aktor
                              <input
                                type="text"
                                value={editForm.actorName}
                                onChange={(e) => setEditForm((f) => (f ? { ...f, actorName: e.target.value } : f))}
                                className="text-[12.5px] px-2.5 py-1.5 rounded-[8px] border border-[#C5CED3] focus:outline-none focus:border-[#0F3B59]"
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#3a3d40]">
                              Jabatan / Peran
                              <input
                                type="text"
                                value={editForm.actorRole}
                                onChange={(e) => setEditForm((f) => (f ? { ...f, actorRole: e.target.value } : f))}
                                className="text-[12.5px] px-2.5 py-1.5 rounded-[8px] border border-[#C5CED3] focus:outline-none focus:border-[#0F3B59]"
                              />
                            </label>
                          </div>
                          <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#3a3d40]">
                            Catatan
                            <textarea
                              value={editForm.notes}
                              onChange={(e) => setEditForm((f) => (f ? { ...f, notes: e.target.value } : f))}
                              rows={2}
                              className="text-[12.5px] px-2.5 py-1.5 rounded-[8px] border border-[#C5CED3] focus:outline-none focus:border-[#0F3B59] resize-none"
                            />
                          </label>
                          <div className="flex gap-2 justify-end">
                            <button onClick={cancelEdit} disabled={savingEdit} className="text-[11px] font-bold px-2.5 py-1 rounded-[8px] border border-[#C5CED3] bg-white hover:bg-[#f7f8f8] disabled:opacity-50 transition-all duration-200">
                              Batal
                            </button>
                            <button onClick={() => saveEdit(h.id)} disabled={savingEdit} className="text-[11px] font-bold px-2.5 py-1 rounded-[8px] border border-[#0F3B59] bg-[#0F3B59] text-white hover:bg-[#0B2C43] disabled:opacity-50 transition-all duration-200">
                              {savingEdit ? "Menyimpan…" : "Simpan"}
                            </button>
                          </div>
                        </div>
                      ) : (
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
                            {activeUser.isRegionalAdmin && (
                              <button onClick={() => startEdit(h)} className="text-[11px] font-bold px-2.5 py-1 rounded-[8px] border border-[#C5CED3] bg-white hover:bg-[#f7f8f8] active:scale-[0.96] transition-all duration-200">
                                Edit
                              </button>
                            )}
                            <button onClick={() => toggleExpand(h.id)} className="text-[11px] font-bold px-2.5 py-1 rounded-[8px] border border-[#C5CED3] bg-white hover:bg-[#f7f8f8] active:scale-[0.96] transition-all duration-200">
                              {isExpanded ? "Tutup detail perubahan" : "Lihat detail perubahan"}
                            </button>
                          </div>
                        </div>
                      )}
                      {isExpanded && editingId !== h.id && (
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

        </div>
      </div>

    </div>
  );
}
