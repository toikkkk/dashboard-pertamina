"use client";

import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { DocumentItem } from "@/lib/mockData";
import { FileWarning, FileCheck2 } from "lucide-react";

const SHEET_ROW_CAP = 40;

function fmtDate(iso: string) {
  if (!iso) return "-";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

// Real backend era: every fileUrl is an opaque /api/files/:id/download route (see
// CLAUDE.md's "Backend / database" section) — no extension in the URL itself, so kind
// is derived from the real file's original filename (doc.fileName, populated by
// loadDocumentItem from file_registry) instead. Previously this checked for a
// "/sample-docs/" URL prefix, back when only 10 hand-copied demo files were ever real —
// that stopped being true the moment the real migration ran, silently sending every
// document (including genuinely real ones) into the "no file" fallback below.
function getFileKind(fileName: string | undefined): "pdf" | "spreadsheet" | "none" {
  if (!fileName) return "none";
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "xlsx" || ext === "xls" || ext === "xlsm") return "spreadsheet";
  return "none";
}

export default function DocumentContentPreview({ document: doc }: { document: DocumentItem }) {
  const kind = getFileKind(doc.fileName);
  const [sheetRows, setSheetRows] = useState<string[][] | null>(null);
  const [sheetError, setSheetError] = useState(false);

  useEffect(() => {
    if (kind !== "spreadsheet") return;
    let cancelled = false;
    setSheetRows(null);
    setSheetError(false);
    fetch(doc.fileUrl)
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        if (cancelled) return;
        const wb = XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "" });
        setSheetRows(rows.slice(0, SHEET_ROW_CAP));
      })
      .catch(() => {
        if (!cancelled) setSheetError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [doc.fileUrl, kind]);

  if (kind === "pdf") {
    return (
      <div>
        <RealFileBadge />
        <iframe src={doc.fileUrl} title={doc.title} className="w-full h-[70vh] border border-[#D6DEE8] rounded-[2px] bg-[#fafafb]" />
      </div>
    );
  }

  if (kind === "spreadsheet") {
    if (sheetError) {
      return (
        <div>
          <RealFileBadge />
          <div className="flex items-center gap-2.5 p-5 border border-[#D6DEE8] rounded-[2px] text-[#6b6e72]">
            <FileWarning className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />
            <span className="text-[12.5px]">Berkas tidak bisa dimuat sebagai pratinjau tabel.</span>
          </div>
        </div>
      );
    }
    if (!sheetRows) {
      return (
        <div>
          <RealFileBadge />
          <div className="p-10 text-center text-[12.5px] text-[#9a9da0]">Memuat data spreadsheet…</div>
        </div>
      );
    }
    const maxCols = Math.max(1, ...sheetRows.map((r) => r.length));
    return (
      <div>
        <RealFileBadge />
        <div className="border border-[#D6DEE8] rounded-[2px] overflow-auto max-h-[70vh]">
          <table className="border-collapse text-[11px] w-full">
            <tbody>
              {sheetRows.map((row, ri) => (
                <tr key={ri} className={ri === 0 ? "bg-[#fafafb] sticky top-0" : "border-t border-[#f0f0f1]"}>
                  {Array.from({ length: maxCols }).map((_, ci) => (
                    <td key={ci} className={`px-2.5 py-1.5 whitespace-nowrap ${ri === 0 ? "font-bold text-[#3a3d40]" : "text-[#3a3d40]"}`}>
                      {row[ci] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {sheetRows.length === SHEET_ROW_CAP && (
            <div className="px-3 py-2 text-[10.5px] text-[#9a9da0] bg-[#fafafb] border-t border-[#f0f0f1]">
              Menampilkan {SHEET_ROW_CAP} baris pertama dari sheet ini.
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback for the remaining mock documents that don't have a real file behind them —
  // a plain metadata grid (all real DocumentItem fields, nothing fabricated). Previously
  // this rendered a simulated letterhead + fake "TERVERIFIKASI · PKI" stamp, then an amber
  // "berkas belum tersedia" warning banner on top of a metadata grid — both dropped per
  // explicit feedback; the grid alone reads cleanly without needing to call out what it
  // *isn't*.
  return (
    <div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 bg-[#fafafb] border border-[#eceded] rounded-[2px] p-6">
        <InfoField label="No. Dokumen" value={doc.documentNumber} />
        <InfoField label="Jenis PSI" value={doc.psiType} />
        <InfoField label="Judul" value={doc.title} span />
        <InfoField label="Lokasi" value={doc.location} />
        <InfoField label="Versi Berlaku" value={`v${doc.currentVersion}`} />
        <InfoField label="Tanggal Terbit" value={fmtDate(doc.issueDate)} />
        <InfoField label="Berlaku s.d." value={fmtDate(doc.expiryDate)} />
      </div>
    </div>
  );
}

function InfoField({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? "col-span-2" : undefined}>
      <div className="text-[10px] font-bold tracking-[.05em] text-[#9a9da0] uppercase mb-1">{label}</div>
      <div className="text-[13px] font-semibold text-[#0F172A]">{value}</div>
    </div>
  );
}

function RealFileBadge() {
  return (
    <div className="flex items-center gap-1.5 mb-2.5">
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[.05em] px-2 py-[3px] rounded-[2px] bg-[#DCFCE7] text-[#15803D]">
        <FileCheck2 className="w-3 h-3" strokeWidth={2.2} />
        Berkas Asli
      </span>
    </div>
  );
}

export { getFileKind };
