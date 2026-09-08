"use client";

import React from "react";
import Link from "next/link";
import { DocumentItem } from "@/lib/mockData";
import { X, Download, ExternalLink } from "lucide-react";
import DocumentContentPreview, { getFileKind } from "@/components/DocumentContentPreview";
import DocumentMetadataFallback from "@/components/DocumentMetadataFallback";

interface DocumentPreviewModalProps {
  document: DocumentItem;
  onClose: () => void;
  onDownload: () => void;
}

const STATUS_META: Record<string, { color: string; tint: string }> = {
  Approved: { color: "#15803D", tint: "#DCFCE7" },
  "In Routing": { color: "#B45309", tint: "#FEF3C7" },
  "Revision Required": { color: "#6D28D9", tint: "#EDE9FE" },
  Expired: { color: "#DC2626", tint: "#FEE2E2" },
};

// Rendering itself lives in DocumentContentPreview (shared with DocumentSplitViewer's
// "Detail Dokumen" tab) — real PDF/spreadsheet content when the document's primary
// file is one of those types, a plain metadata-grid fallback otherwise.
export default function DocumentPreviewModal({ document: doc, onClose, onDownload }: DocumentPreviewModalProps) {
  const meta = STATUS_META[doc.status] ?? { color: "#6b6e72", tint: "#eceded" };
  const isRealFile = getFileKind(doc.fileName) !== "none";

  return (
    <div
      className="fixed inset-0 bg-[rgba(15,23,42,.55)] flex items-center justify-center z-[100] p-6 animate-backdropIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[720px] max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-[0_24px_64px_rgba(15,23,42,.3)] animate-modalPop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#eceded] sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <span className="font-heading text-xs text-[#9a9da0]">{doc.documentNumber}</span>
            <span className="inline-flex items-center text-[10.5px] font-bold px-2 py-[3px] rounded-[8px]" style={{ background: meta.tint, color: meta.color }}>
              {doc.status}
            </span>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="p-1.5 rounded-[8px] hover:bg-[#F5F7F9] transition-colors duration-200">
            <X className="w-4 h-4 text-[#6b6e72]" strokeWidth={2} />
          </button>
        </div>

        <div className="p-6">
          <h3 className="font-heading text-[15px] font-bold mb-3.5 leading-snug">{doc.title}</h3>
          <DocumentContentPreview
            fileUrl={doc.fileUrl}
            fileName={doc.fileName}
            title={doc.title}
            fallback={<DocumentMetadataFallback document={doc} />}
          />
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-t border-[#eceded] sticky bottom-0 bg-white">
          <Link
            href={`/document/${doc.id}`}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-[#0F3B59] hover:text-[#0B2C43] transition-colors duration-200"
          >
            <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.9} />
            Buka halaman lengkap
          </Link>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-[12.5px] font-bold px-3.5 py-2 rounded-[8px] border border-[#C5CED3] bg-white hover:bg-[#f7f8f8] active:scale-[0.97] transition-all duration-200">
              Tutup
            </button>
            {isRealFile ? (
              <a
                href={doc.fileUrl}
                download
                className="text-[12.5px] font-bold px-3.5 py-2 rounded-[8px] border border-[#0F3B59] bg-[#0F3B59] hover:bg-[#0B2C43] active:scale-[0.97] text-white flex items-center gap-1.5 transition"
              >
                <Download className="w-[13px] h-[13px]" strokeWidth={1.9} />
                Unduh Berkas
              </a>
            ) : (
              <button
                onClick={onDownload}
                className="text-[12.5px] font-bold px-3.5 py-2 rounded-[8px] border border-[#0F3B59] bg-[#0F3B59] hover:bg-[#0B2C43] active:scale-[0.97] text-white flex items-center gap-1.5 transition"
              >
                <Download className="w-[13px] h-[13px]" strokeWidth={1.9} />
                Unduh Berkas
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
