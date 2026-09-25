"use client";

import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { FileWarning, FileCheck2, FileText } from "lucide-react";

const SHEET_ROW_CAP = 40;
// XLSX.read is synchronous and blocks the main thread, and `arrayBuffer()` still has
// to pull the whole file off the network first. The largest curated document is a
// 23MB .xlsm that took ~10s+ just to download and would freeze the tab on parse, which
// is what made "Lihat" look permanently broken. Capped well below that: spreadsheet
// preview is a quick glance, not a full editor — past 8MB the honest answer is
// "download it". (The value is also checked against Content-Length BEFORE reading the
// body, so an over-size file bails immediately instead of after a full download.)
const MAX_PARSE_BYTES = 8 * 1024 * 1024;

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
  const [sheetError, setSheetError] = useState<string | null>(null);
  // null = belum dicek (render <embed> seperti biasa); false = perangkat tanpa penampil PDF.
  const [inlinePdf, setInlinePdf] = useState<boolean | null>(null);
  useEffect(() => {
    const nav = navigator as Navigator & { pdfViewerEnabled?: boolean };
    const touchMac = navigator.maxTouchPoints > 1 && /Mac/i.test(navigator.platform);
    const phone = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || touchMac;
    setInlinePdf(!phone && (nav.pdfViewerEnabled ?? true));
  }, []);

  // Spreadsheets are the only kind fetched+parsed in the browser (PDF/image hand the
  // URL straight to the browser) — so this effect is the only place a preview can
  // hang, and it did.
  //
  // REAL BUG FIXED HERE (2026-09-17, reproduced in Chromium, not inferred): the old
  // version used a `cancelled` boolean but never ABORTED the in-flight request. React
  // StrictMode double-invokes effects in dev, so opening a preview fired two identical
  // full-size downloads of the same file; the orphaned one kept streaming, the two
  // competed, and one died with net::ERR_CONTENT_LENGTH_MISMATCH. Because that
  // rejection belonged to the run whose `cancelled` flag was already true, the error
  // was swallowed and no state was ever set — leaving "Memuat data spreadsheet…" on
  // screen forever. That is exactly the reported "Lihat shows no document" in the
  // Directory: 8 of 11 curated documents are spreadsheets (up to 23MB), while Arsip
  // Registry happened to open PDFs, which never take this path. The API, RBAC and
  // presigned URLs were all verified correct and identical for both pages.
  //
  // Three things make it robust now: a real AbortController (no orphaned stream, so
  // the mismatch can't happen), AbortError distinguished from genuine failure, and
  // every failure path setting an explicit message — this must never silently sit on
  // the loading state again.
  useEffect(() => {
    if (kind !== "spreadsheet") return;

    const controller = new AbortController();
    let settled = false;
    setSheetRows(null);
    setSheetError(null);

    // A stalled/blocked response would otherwise leave the loading text up
    // indefinitely with nothing to click; surface it as an error instead.
    const timeoutId = setTimeout(() => {
      if (!settled) controller.abort(new DOMException("timeout", "TimeoutError"));
    }, 45000);

    (async () => {
      try {
        const res = await fetch(fileUrl, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // Bail BEFORE reading the body when the redirect target already advertises a
        // size over the cap — otherwise a large file gets fully downloaded (slow) and
        // only then rejected, which was the "stuck loading for 10+ seconds" symptom.
        const declaredLength = Number(res.headers.get("content-length") ?? "0");
        if (declaredLength > MAX_PARSE_BYTES) {
          settled = true;
          setSheetError("Berkas terlalu besar untuk dipratinjau di browser. Silakan unduh berkasnya.");
          return;
        }
        const buf = await res.arrayBuffer();
        // Defensive second check for responses that stream without a Content-Length.
        if (buf.byteLength > MAX_PARSE_BYTES) {
          settled = true;
          setSheetError("Berkas terlalu besar untuk dipratinjau di browser. Silakan unduh berkasnya.");
          return;
        }
        const wb = XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "" });
        settled = true;
        setSheetRows(rows.slice(0, SHEET_ROW_CAP));
      } catch (err) {
        // An abort from StrictMode's cleanup (or unmount) is expected and must stay
        // silent — the surviving run owns the UI state.
        if (controller.signal.aborted && (err as DOMException)?.name !== "TimeoutError") return;
        settled = true;
        setSheetError(
          (err as DOMException)?.name === "TimeoutError"
            ? "Berkas terlalu lama dimuat. Coba lagi atau unduh berkasnya."
            : "Berkas tidak bisa dimuat sebagai pratinjau tabel."
        );
      } finally {
        clearTimeout(timeoutId);
      }
    })();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [fileUrl, kind]);

  if (kind === "image") {
    return (
      <div>
        <RealFileBadge />
        <div className="flex items-center justify-center border border-[#C5CED3] rounded-[8px] bg-[#fafafb] p-3 max-h-[70vh] overflow-auto">
          {/* eslint-disable-next-line @next/next/no-img-element -- remote, private (RBAC-gated) source; next/image's optimizer needs a whitelisted domain, not applicable to a same-origin proxy route like this */}
          <img src={fileUrl} alt={title} className="max-w-full max-h-[66vh] object-contain" />
        </div>
      </div>
    );
  }

  if (kind === "pdf" && inlinePdf === false) {
    // Ponsel (iOS/Android) dan browser tanpa penampil PDF bawaan tidak bisa merender <embed>:
    // hasilnya kotak kosong. Beri tombol buka (penampil bawaan perangkat) dan unduh.
    return (
      <div>
        <RealFileBadge />
        <div className="flex flex-col items-center text-center gap-3 p-8 border border-[#C5CED3] rounded-[12px] bg-[#fafafb]">
          <FileText className="w-8 h-8 text-[#0F3B59]" strokeWidth={1.5} />
          <p className="text-[13px] font-semibold text-[#0F172A] break-words max-w-full">{fileName ?? title}</p>
          <div className="flex flex-wrap justify-center gap-2.5">
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 rounded-[8px] bg-[#0F3B59] hover:bg-[#0B2C43] text-white text-[13px] font-bold transition-colors">Buka PDF</a>
            <a href={fileUrl} download className="px-4 py-2.5 rounded-[8px] border border-[#0F3B59] text-[#0F3B59] hover:bg-[#E2E8EB] text-[13px] font-bold transition-colors">Unduh</a>
          </div>
        </div>
      </div>
    );
  }

  if (kind === "pdf") {
    return (
      <div>
        <RealFileBadge />
        {/* <embed>, not <iframe> — an iframe pointed at a cross-origin PDF (our
            presigned R2 redirect) inconsistently fell back to a native download
            prompt instead of rendering inline, even with Content-Disposition:
            inline set. <embed type="application/pdf"> hands the URL to the
            browser's PDF plugin directly rather than trying to navigate a
            sub-document into it, which renders reliably instead. */}
        <embed src={fileUrl} type="application/pdf" title={title} className="w-full h-[70vh] border border-[#C5CED3] rounded-[8px] bg-[#fafafb]" />
      </div>
    );
  }

  if (kind === "spreadsheet") {
    if (sheetError) {
      return (
        <div>
          <RealFileBadge />
          <div className="flex items-start gap-2.5 p-5 border border-[#C5CED3] rounded-[8px] text-[#6b6e72]">
            <FileWarning className="w-4 h-4 flex-shrink-0 mt-px" strokeWidth={1.8} />
            {/* The specific reason, not one generic line for every failure — a
                too-large file, a timeout and a parse error need different actions
                from the user. */}
            <span className="text-[12.5px] leading-relaxed">{sheetError}</span>
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
        <div className="border border-[#C5CED3] rounded-[8px] overflow-auto max-h-[70vh]">
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
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[.05em] px-2 py-[3px] rounded-[8px] bg-[#DCFCE7] text-[#15803D]">
        <FileCheck2 className="w-3 h-3" strokeWidth={2.2} />
        Berkas Asli
      </span>
    </div>
  );
}

export { getFileKind };
