"use client";

import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { FileWarning, FileCheck2 } from "lucide-react";

const SHEET_ROW_CAP = 40;

// Real backend era: every fileUrl is an opaque /api/files/:id/download route (see
// CLAUDE.md's "Backend / database" section) — no extension in the URL itself, so kind
// is derived from the real file's original filename instead. Previously this checked
// for a "/sample-docs/" URL prefix, back when only 10 hand-copied demo files were ever
// real — that stopped being true the moment the real migration ran, silently sending
// every document (including genuinely real ones) into the "no file" fallback below.
function getFileKind(fileName: string | undefined): "pdf" | "spreadsheet" | "image" | "none" {
  if (!fileName) return "none";
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "xlsx" || ext === "xls" || ext === "xlsm") return "spreadsheet";
  // A large share of the raw archive's "Evidence" folders are inspection photos —
  // without this, every one of them fell into the metadata-grid fallback despite
  // being trivially previewable.
  if (ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "gif" || ext === "bmp" || ext === "webp") return "image";
  return "none";
}

interface DocumentContentPreviewProps {
  fileUrl: string;
  fileName?: string;
  title: string;
  /** Rendered when the file type has no built-in preview (or there's no file at all).
   * Kept as a caller-supplied node rather than baked in here — a curated document's
   * fallback (compliance metadata grid) and a raw registry file's fallback (archive
   * metadata) show genuinely different fields, so neither belongs hardcoded into this
   * shared preview component. */
  fallback: React.ReactNode;
}

export default function DocumentContentPreview({ fileUrl, fileName, title, fallback }: DocumentContentPreviewProps) {
  const kind = getFileKind(fileName);
  const [sheetRows, setSheetRows] = useState<string[][] | null>(null);
  const [sheetError, setSheetError] = useState(false);

  useEffect(() => {
    if (kind !== "spreadsheet") return;
    let cancelled = false;
    setSheetRows(null);
    setSheetError(false);
    fetch(fileUrl)
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
  }, [fileUrl, kind]);

  if (kind === "image") {
    return (
      <div>
        <RealFileBadge />
        <div className="flex items-center justify-center border border-[#D6DEE8] rounded-[2px] bg-[#fafafb] p-3 max-h-[70vh] overflow-auto">
          {/* eslint-disable-next-line @next/next/no-img-element -- remote, private (RBAC-gated) source; next/image's optimizer needs a whitelisted domain, not applicable to a same-origin proxy route like this */}
          <img src={fileUrl} alt={title} className="max-w-full max-h-[66vh] object-contain" />
        </div>
      </div>
    );
  }

  if (kind === "pdf") {
    return (
      <div>
        <RealFileBadge />
        <iframe src={fileUrl} title={title} className="w-full h-[70vh] border border-[#D6DEE8] rounded-[2px] bg-[#fafafb]" />
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

  return <div>{fallback}</div>;
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
