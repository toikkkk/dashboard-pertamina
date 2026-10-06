"use client";

import React, { useState } from "react";
import { usePsi } from "@/lib/psiStore";
import { CheckCircle2, Upload as UploadIcon, RefreshCw, FileText, FileSpreadsheet, FileType, ArrowUp, ArrowDown, ArrowUpDown, Eye } from "lucide-react";
import DocumentPreviewModal from "@/components/DocumentPreviewModal";
import UpdateTypeBadge from "@/components/UpdateTypeBadge";
import StatusTag from "@/components/StatusTag";
import { isDocOverdue, type DocumentItem } from "@/lib/mockData";
import { uploadFileToR2 } from "@/lib/uploadFile";
import { DOCUMENT_STATUS_META } from "@/lib/domain/statusStyle";

type SortKey = "documentNumber" | "title" | "fileType" | "location" | "expiryDate";
const SORT_LABELS: Record<SortKey, string> = {
  documentNumber: "No. Kasus",
  title: "Judul",
  fileType: "Tipe Berkas",
  location: "Lokasi",
  expiryDate: "Expired",
};

const fileExt = (name?: string) => (name?.split(".").pop() ?? "").toLowerCase();

function compareDocs(a: DocumentItem, b: DocumentItem, key: SortKey): number {
  const num = { numeric: true } as const;
  switch (key) {
    case "documentNumber": return a.documentNumber.localeCompare(b.documentNumber, undefined, num);
    case "title": return a.title.localeCompare(b.title, undefined, num);
    case "fileType": return fileExt(a.fileName).localeCompare(fileExt(b.fileName));
    case "location": return a.location.localeCompare(b.location);
    case "expiryDate": return a.expiryDate.localeCompare(b.expiryDate);
  }
}

type Row = { type: "header"; location: string; count: number } | { type: "doc"; doc: DocumentItem };

function fmtDate(iso: string) {
  if (!iso) return "-";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

// Shared between the desktop table's expand-row and the mobile card list's
// expand-section, same as the analogous form in admin/registry.
function ReviseForm({
  docId,
  docTitle,
  suggestedVersion,
  newVersionInput,
  setNewVersionInput,
  revisedFile,
  setRevisedFile,
  revisionNotes,
  setRevisionNotes,
  revisionError,
  revising,
  onSubmit,
}: {
  docId: string;
  docTitle: string;
  suggestedVersion: string;
  newVersionInput: string;
  setNewVersionInput: (v: string) => void;
  revisedFile: File | null;
  setRevisedFile: (f: File | null) => void;
  revisionNotes: string;
  setRevisionNotes: (v: string) => void;
  revisionError: string | null;
  revising: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-3">
        <div>
          <label className="block text-[11px] font-semibold text-[#6b6e72] mb-[5px]">Versi Baru</label>
          <input
            type="text"
            placeholder={suggestedVersion}
            value={newVersionInput}
            onChange={(e) => setNewVersionInput(e.target.value)}
            className="w-full min-h-[34px] px-2.5 py-1 text-[12.5px] border border-[#C5CED3] rounded-[8px]"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[#6b6e72] mb-[5px]">Berkas Baru</label>
          <input
            id={`reviseFileInput-${docId}`}
            type="file"
            accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
            onChange={(e) => setRevisedFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <label
            htmlFor={`reviseFileInput-${docId}`}
            className="flex items-center gap-1.5 min-h-[34px] px-2.5 py-1 text-xs border border-[#C5CED3] rounded-[8px] bg-white cursor-pointer transition-colors duration-200 hover:bg-[#f7f8f8] hover:border-[#9a9da0]"
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
            className="w-full min-h-[34px] px-2.5 py-1 text-[12.5px] border border-[#C5CED3] rounded-[8px]"
          />
        </div>
      </div>
      {revisionError && <p className="mb-2.5 text-[11.5px] font-semibold text-[#DC2626]">{revisionError}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={revising}
          className="text-xs font-bold px-3.5 py-2 rounded-[8px] border border-[#0F3B59] bg-[#0F3B59] hover:bg-[#0B2C43] active:scale-[0.97] text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {revising ? "Mengunggah…" : "Simpan Revisi"}
        </button>
      </div>
    </form>
  );
}

// Helper untuk menampilkan tipe file berdasarkan ekstensi (PDF, Excel, Word, Image, dll)
function FileTypeBadge({ fileName }: { fileName?: string }) {
  if (!fileName) return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-[8px] bg-[#F5F7F9] text-[#9a9da0]"><FileType className="w-3 h-3" /> Unknown</span>;

  const ext = fileName.split(".").pop()?.toLowerCase();
  let icon: JSX.Element, label: string, color: string, bgColor: string;

  switch (ext) {
    case "pdf":
      icon = <FileText className="w-3 h-3" strokeWidth={1.8} />;
      label = "PDF";
      color = "#DC2626";
      bgColor = "#FEE2E2";
      break;
    case "xlsx":
    case "xls":
    case "xlsm":
      icon = <FileSpreadsheet className="w-3 h-3" strokeWidth={1.8} />;
      label = "Excel";
      color = "#15803D";
      bgColor = "#DCFCE7";
      break;
    case "doc":
    case "docx":
      icon = <FileText className="w-3 h-3" strokeWidth={1.8} />;
      label = "Word";
      color = "#2563EB";
      bgColor = "#DBEAFE";
      break;
    case "jpg":
    case "jpeg":
    case "png":
      icon = <FileType className="w-3 h-3" strokeWidth={1.8} />;
      label = "Image";
      color = "#7C3AED";
      bgColor = "#EDE9FE";
      break;
    default:
      icon = <FileType className="w-3 h-3" strokeWidth={1.8} />;
      label = "File";
      color = "#6B7280";
      bgColor = "#F3F4F6";
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-[8px]" style={{ background: bgColor, color }}>
      {icon}
      {label}
    </span>
  );
}

export default function ExpiringDocsTable() {
  // `allDocuments`, BUKAN `documents` — `documents` juga kena filter lokasi/jenis
  // dropdown milik Dashboard (`selectedLocationFilter`/`selectedTypeFilter`, lihat
  // psiStore.tsx), state yang terus hidup lintas halaman karena satu Context yang
  // sama. Kalau admin sempat pilih satu lokasi tertentu di dropdown Dashboard lalu
  // pindah ke halaman Overdue, tabel ini akan diam-diam kosong kalau lokasi yang
  // masih overdue bukan lokasi yang sedang dipilih — padahal badge di sidebar
  // (AppShell.tsx, pakai `documents` juga) bisa saja masih sempat menunjukkan angka
  // dari render sebelum filter itu aktif, membuatnya kelihatan seperti bug badge-vs-
  // halaman. Halaman Overdue harus selalu menampilkan SEMUA dokumen overdue yang
  // boleh dilihat user (baca lintas-lokasi sudah diizinkan sejak 2026-09-25, lihat
  // CLAUDE.md), sama seperti getComplianceMetrics() & grafik "Dokumen per Terminal"
  // yang sudah lebih dulu memakai allDocuments dengan alasan yang sama persis.
  const { allDocuments, activeUser, extendValidity, reviseDocument } = usePsi();
  const [selectedDocForRevise, setSelectedDocForRevise] = useState<string | null>(null);
  const [newVersionInput, setNewVersionInput] = useState<string>("");
  const [revisionNotes, setRevisionNotes] = useState<string>("");
  const [revisedFile, setRevisedFile] = useState<File | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<{ text: string; closing?: boolean } | null>(null);
  const [revisionError, setRevisionError] = useState<string | null>(null);
  const [revising, setRevising] = useState(false);
  const [view, setView] = useState<"mine" | "other">("mine");
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "expiryDate", dir: 1 });

  const expiringDocs = allDocuments.filter(isDocOverdue);

  // User berlokasi: "Lokasi Saya" dan "Lokasi Lain" dipisah jadi dua tab (bukan satu
  // daftar campur); lokasi lain dikelompokkan per terminal. Admin Regional / akun tanpa
  // lokasi tidak punya "lokasi sendiri", jadi langsung melihat semua, dikelompokkan per
  // terminal juga.
  const hasOwnLocation = !activeUser.isRegionalAdmin && !!activeUser.location;
  const mineDocs = hasOwnLocation ? expiringDocs.filter((d) => d.location === activeUser.location) : [];
  const otherDocs = hasOwnLocation ? expiringDocs.filter((d) => d.location !== activeUser.location) : expiringDocs;
  const showingOther = !hasOwnLocation || view === "other";

  const sortDocs = (list: DocumentItem[]) =>
    [...list].sort((a, b) => sort.dir * compareDocs(a, b, sort.key) || a.documentNumber.localeCompare(b.documentNumber, undefined, { numeric: true }));

  const rows: Row[] = [];
  if (showingOther) {
    const byLocation = new Map<string, DocumentItem[]>();
    for (const d of otherDocs) byLocation.set(d.location, [...(byLocation.get(d.location) ?? []), d]);
    const locationOrder = Array.from(byLocation.keys()).sort((a, b) => (sort.key === "location" ? sort.dir : 1) * a.localeCompare(b));
    for (const loc of locationOrder) {
      const list = byLocation.get(loc)!;
      rows.push({ type: "header", location: loc, count: list.length });
      for (const d of sortDocs(list)) rows.push({ type: "doc", doc: d });
    }
  } else {
    for (const d of sortDocs(mineDocs)) rows.push({ type: "doc", doc: d });
  }

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  const SortIcon = ({ k }: { k: SortKey }) =>
    sort.key !== k ? <ArrowUpDown className="w-3 h-3 opacity-60" strokeWidth={2} /> : sort.dir === 1 ? <ArrowUp className="w-3 h-3" strokeWidth={2.2} /> : <ArrowDown className="w-3 h-3" strokeWidth={2.2} />;
  const sortTh = (k: SortKey) => (
    <th aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] uppercase">
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={`inline-flex items-center gap-1 uppercase tracking-[.05em] transition-colors duration-150 hover:text-[#0F3B59] ${sort.key === k ? "text-[#0F3B59]" : "text-[#9a9da0]"}`}
      >
        {SORT_LABELS[k]}
        <SortIcon k={k} />
      </button>
    </th>
  );
  // Lihat boleh lintas-lokasi, tapi aksi (Perpanjang/Revisi) tetap hak tulis lokasi
  // sendiri — server sudah menolaknya lewat assertLocationWrite kalau dilanggar,
  // ini cuma supaya tombolnya tidak muncul dulu untuk dokumen yang bukan haknya
  // (pola yang sama dengan canUserApproveDoc di tempat lain).
  const canWrite = (doc: DocumentItem) => activeUser.isRegionalAdmin || doc.location === activeUser.location;

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
    <div className="bg-white border border-[#D8E1E4] rounded-[12px] shadow-[0_2px_6px_rgba(15,23,42,.045)] overflow-hidden">
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

      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
          onDownload={() => flashSuccess(`Mengunduh berkas v${previewDoc.currentVersion} (${previewDoc.fileName ?? "berkas"}) — simulasi.`)}
        />
      )}

      {hasOwnLocation && (
        <div className="flex gap-1 p-2 border-b border-[#f0f0f1] bg-[#fafafb]">
          {([
            { key: "mine", label: `Lokasi Saya · ${activeUser.location}`, count: mineDocs.length },
            { key: "other", label: "Lokasi Lain", count: otherDocs.length },
          ] as const).map((t) => {
            const active = view === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setView(t.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-[8px] text-[12.5px] font-semibold transition-all duration-200 ${
                  active ? "bg-[#E2E8EB] text-[#0B2C43]" : "text-[#3a3d40] hover:bg-[#f0f0f1]"
                }`}
              >
                {t.label}
                <span className="text-[10px] font-bold bg-white text-[#3a3d40] px-1.5 py-0.5 rounded-full border border-[#D8E1E4]">{t.count}</span>
              </button>
            );
          })}
        </div>
      )}

      {rows.length === 0 && (
        <p className="px-4 py-10 text-center text-[12.5px] text-[#9a9da0]">
          {showingOther ? "Tidak ada dokumen overdue di lokasi lain." : `Tidak ada dokumen overdue di ${activeUser.location}.`}
        </p>
      )}

      <div className="lg:hidden flex gap-1.5 overflow-x-auto px-3.5 py-2 border-b border-[#f0f0f1]">
        {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => toggleSort(k)}
            className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] border text-[11px] font-bold transition-colors duration-150 ${
              sort.key === k ? "border-[#0F3B59] bg-[#E2E8EB] text-[#0B2C43]" : "border-[#C5CED3] bg-white text-[#3a3d40]"
            }`}
          >
            {SORT_LABELS[k]}
            <SortIcon k={k} />
          </button>
        ))}
      </div>

      <div className="lg:hidden divide-y divide-[#f0f0f1]">
        {rows.map((row, i) => {
          if (row.type === "header") {
            return (
              <div key={`h-${row.location}`} className="px-3.5 py-2 bg-[#F5F7F9] text-[11px] font-bold tracking-[.05em] uppercase text-[#3a3d40]">
                {row.location} <span className="text-[#9a9da0] normal-case tracking-normal font-semibold">· {row.count} dokumen</span>
              </div>
            );
          }
          const doc = row.doc;
          const vNum = parseFloat(doc.currentVersion) || 1;
          const suggestedVersion = (vNum + 1).toFixed(1);
          const isRevising = selectedDocForRevise === doc.id;
          return (
            <div key={doc.id} className="px-3.5 py-3 animate-fadeInUp" style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-[#6b6e72] font-mono text-xs">{doc.documentNumber}</span>
                <span className="flex-shrink-0"><StatusTag color={DOCUMENT_STATUS_META.Expired.color} label="Expired" size="sm" /></span>
              </div>
              <div className="font-semibold text-[13px] mb-0.5">{doc.title}
                <div className="mt-0.5"><FileTypeBadge fileName={doc.fileName} /></div>
              </div>
              <div className="mb-1"><UpdateTypeBadge history={doc.history} /></div>
              <div className="text-[12px] text-[#6b6e72] mb-2.5">
                {doc.location} · Expired {fmtDate(doc.expiryDate)}
              </div>
              <button
                onClick={() => setPreviewDoc(doc)}
                className="w-full justify-center mb-2 text-[11.5px] font-bold px-2.5 py-2 rounded-[8px] border border-[#C5CED3] bg-white hover:bg-[#f7f8f8] active:scale-[0.97] flex items-center gap-1.5 transition"
              >
                <Eye className="w-3 h-3 text-[#3a3d40]" strokeWidth={1.8} />
                Lihat
              </button>
              {canWrite(doc) ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExtend(doc.id)}
                    className="flex-1 justify-center text-[11.5px] font-bold px-2.5 py-2 rounded-[8px] border border-[#C5CED3] bg-white hover:bg-[#f7f8f8] active:scale-[0.97] flex items-center gap-1.5 transition"
                  >
                    <RefreshCw className="w-3 h-3 text-[#3a3d40]" strokeWidth={1.8} />
                    Perpanjang
                  </button>
                  <button
                    onClick={() => openRevise(doc.id, suggestedVersion)}
                    className="flex-1 justify-center text-[11.5px] font-bold px-2.5 py-2 rounded-[8px] border border-[#0F3B59] bg-[#0F3B59] hover:bg-[#0B2C43] active:scale-[0.97] text-white flex items-center gap-1.5 transition"
                  >
                    <UploadIcon className="w-3 h-3" strokeWidth={1.8} />
                    Revisi File
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-[#9a9da0] italic">Lokasi lain · lihat saja</p>
              )}

              {isRevising && (
                <div className="mt-3 bg-[#f7f8f8] -mx-3.5 px-3.5 py-[18px] border-t border-[#f0f0f1] animate-fadeInUp">
                  <p className="mb-3 text-[12.5px] font-bold text-[#3a3d40]">Revisi File — {doc.title}</p>
                  <ReviseForm
                    docId={doc.id}
                    docTitle={doc.title}
                    suggestedVersion={suggestedVersion}
                    newVersionInput={newVersionInput}
                    setNewVersionInput={setNewVersionInput}
                    revisedFile={revisedFile}
                    setRevisedFile={setRevisedFile}
                    revisionNotes={revisionNotes}
                    setRevisionNotes={setRevisionNotes}
                    revisionError={revisionError}
                    revising={revising}
                    onSubmit={(e) => handleReviseSubmit(e, doc.id, suggestedVersion)}
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedDocForRevise(null)}
                    disabled={revising}
                    className="mt-2 text-xs font-bold px-3.5 py-2 rounded-[8px] border border-[#C5CED3] bg-white hover:bg-[#f0f0f1] active:scale-[0.97] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Batal
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="hidden lg:block overflow-x-auto">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr className="bg-[#fafafb]">
            {sortTh("documentNumber")}
            {sortTh("title")}
            {sortTh("fileType")}
            {sortTh("location")}
            {sortTh("expiryDate")}
            <th className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">Status</th>
            <th className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">Aksi Dilema 5-Tahun</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            if (row.type === "header") {
              return (
                <tr key={`h-${row.location}`} className="border-t border-[#f0f0f1] bg-[#F5F7F9]">
                  <td colSpan={7} className="px-3.5 py-2 text-[11px] font-bold tracking-[.05em] uppercase text-[#3a3d40]">
                    {row.location} <span className="text-[#9a9da0] normal-case tracking-normal font-semibold">· {row.count} dokumen</span>
                  </td>
                </tr>
              );
            }
            const doc = row.doc;
            // Every row here is overdue by definition (that's the filter above) — show
            // "Expired" consistently rather than a stale stored status like "Approved"
            // that was only ever accurate before its expiryDate passed.
            const vNum = parseFloat(doc.currentVersion) || 1;
            const suggestedVersion = (vNum + 1).toFixed(1);
            const isRevising = selectedDocForRevise === doc.id;
            return (
              <React.Fragment key={doc.id}>
                <tr className="border-t border-[#f0f0f1] hover:bg-[#fafafb] hover:shadow-[inset_3px_0_0_#0F3B59] transition-all duration-200 ease-out-expo animate-fadeInUp" style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>
                  <td className="px-3.5 py-3 text-[#6b6e72] font-mono text-xs">{doc.documentNumber}</td>
                  <td className="px-3.5 py-3 font-semibold max-w-[220px]">
                    {doc.title}
                    <div className="mt-0.5"><UpdateTypeBadge history={doc.history} /></div>
                  </td>
                  <td className="px-3.5 py-3"><FileTypeBadge fileName={doc.fileName} /></td>
                  <td className="px-3.5 py-3">{doc.location}</td>
                  <td className="px-3.5 py-3">{fmtDate(doc.expiryDate)}</td>
                  <td className="px-3.5 py-3">
                    <StatusTag color={DOCUMENT_STATUS_META.Expired.color} label="Expired" />
                  </td>
                  <td className="px-3.5 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="text-[11.5px] font-bold px-2.5 py-1.5 rounded-[8px] border border-[#C5CED3] bg-white hover:bg-[#f7f8f8] active:scale-[0.97] flex items-center gap-1.5 transition"
                      >
                        <Eye className="w-3 h-3 text-[#3a3d40]" strokeWidth={1.8} />
                        Lihat
                      </button>
                      {canWrite(doc) ? (
                        <>
                          <button
                            onClick={() => handleExtend(doc.id)}
                            className="text-[11.5px] font-bold px-2.5 py-1.5 rounded-[8px] border border-[#C5CED3] bg-white hover:bg-[#f7f8f8] active:scale-[0.97] flex items-center gap-1.5 transition"
                          >
                            <RefreshCw className="w-3 h-3 text-[#3a3d40]" strokeWidth={1.8} />
                            Perpanjang Validitas
                          </button>
                          <button
                            onClick={() => openRevise(doc.id, suggestedVersion)}
                            className="text-[11.5px] font-bold px-2.5 py-1.5 rounded-[8px] border border-[#0F3B59] bg-[#0F3B59] hover:bg-[#0B2C43] active:scale-[0.97] text-white flex items-center gap-1.5 transition"
                          >
                            <UploadIcon className="w-3 h-3" strokeWidth={1.8} />
                            Revisi File
                          </button>
                        </>
                      ) : (
                        <span className="text-[11.5px] text-[#9a9da0] italic">Lokasi lain · lihat saja</span>
                      )}
                    </div>
                  </td>
                </tr>

                {isRevising && (
                  <tr>
                    <td colSpan={7} className="p-0 border-t border-[#f0f0f1]">
                      <div className="bg-[#f7f8f8] px-5 py-[18px] animate-fadeInUp">
                        <p className="mb-3 text-[12.5px] font-bold text-[#3a3d40]">Revisi File — {doc.title}</p>
                        <ReviseForm
                          docId={doc.id}
                          docTitle={doc.title}
                          suggestedVersion={suggestedVersion}
                          newVersionInput={newVersionInput}
                          setNewVersionInput={setNewVersionInput}
                          revisedFile={revisedFile}
                          setRevisedFile={setRevisedFile}
                          revisionNotes={revisionNotes}
                          setRevisionNotes={setRevisionNotes}
                          revisionError={revisionError}
                          revising={revising}
                          onSubmit={(e) => handleReviseSubmit(e, doc.id, suggestedVersion)}
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedDocForRevise(null)}
                          disabled={revising}
                          className="mt-2 text-xs font-bold px-3.5 py-2 rounded-[8px] border border-[#C5CED3] bg-white hover:bg-[#f0f0f1] active:scale-[0.97] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          Batal
                        </button>
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
    </div>
  );
}
