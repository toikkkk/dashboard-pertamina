"use client";

// "Lihat" modal for the Arsip Registry page — client asked to be able to view an
// archive file without downloading it first. Reuses the same DocumentContentPreview
// (PDF iframe / spreadsheet table / image) that curated documents already use, with
// a registry-specific metadata grid as the fallback for file types with no built-in
// preview (docx, pptx, dwg, ...).
import React from "react";
import { X, Download } from "lucide-react";
import DocumentContentPreview, { getFileKind } from "@/components/DocumentContentPreview";

interface RegistryFile {
  id: string;
  originalFilename: string;
  originalRelativePath: string;
  category: string;
  locationRaw: string | null;
  locationCanonical: string | null;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: string | null;
}

interface RegistryPreviewModalProps {
  file: RegistryFile;
  categoryLabel: string;
  onClose: () => void;
}

function formatBytes(n: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)}${units[i]}`;
}

export default function RegistryPreviewModal({ file, categoryLabel, onClose }: RegistryPreviewModalProps) {
  const fileUrl = `/api/files/${file.id}/download`;
  const isPreviewable = getFileKind(file.originalFilename) !== "none";

  return (
    <div className="fixed inset-0 bg-[rgba(15,23,42,.55)] flex items-center justify-center z-[100] p-6 animate-backdropIn" onClick={onClose}>
      <div
        className="w-full max-w-[720px] max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-[0_24px_64px_rgba(15,23,42,.3)] animate-modalPop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#eceded] sticky top-0 bg-white z-10">
          <span className="font-heading text-xs text-[#9a9da0]" title={file.originalRelativePath}>{categoryLabel}</span>
          <button onClick={onClose} aria-label="Tutup" className="p-1.5 rounded-[8px] hover:bg-[#F5F7F9] transition-colors duration-200">
            <X className="w-4 h-4 text-[#6b6e72]" strokeWidth={2} />
          </button>
        </div>

        <div className="p-6">
          <h3 className="font-heading text-[15px] font-bold mb-3.5 leading-snug break-words">{file.originalFilename}</h3>
          <DocumentContentPreview
            fileUrl={fileUrl}
            fileName={file.originalFilename}
            title={file.originalFilename}
            fallback={
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 bg-[#fafafb] border border-[#eceded] rounded-[8px] p-6">
                <InfoField label="Kategori" value={categoryLabel} />
                <InfoField label="Lokasi" value={file.locationCanonical ?? file.locationRaw ?? "Perlu ditinjau"} />
                <InfoField label="Path Asli" value={file.originalRelativePath} span />
                <InfoField label="Ukuran" value={formatBytes(file.sizeBytes)} />
                <InfoField label="Tipe Berkas" value={file.mimeType} />
              </div>
            }
          />
          {!isPreviewable && (
            <p className="mt-3 text-[11.5px] text-[#9a9da0] leading-relaxed">
              Jenis berkas ini belum punya pratinjau bawaan — unduh untuk membukanya.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[#eceded] sticky bottom-0 bg-white">
          <button onClick={onClose} className="text-[12.5px] font-bold px-3.5 py-2 rounded-[8px] border border-[#C5CED3] bg-white hover:bg-[#f7f8f8] active:scale-[0.97] transition-all duration-200">
            Tutup
          </button>
          <a
            href={fileUrl}
            download
            className="text-[12.5px] font-bold px-3.5 py-2 rounded-[8px] border border-[#0F3B59] bg-[#0F3B59] hover:bg-[#0B2C43] active:scale-[0.97] text-white flex items-center gap-1.5 transition"
          >
            <Download className="w-[13px] h-[13px]" strokeWidth={1.9} />
            Unduh Berkas
          </a>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? "col-span-2" : undefined}>
      <div className="text-[10px] font-bold tracking-[.05em] text-[#9a9da0] uppercase mb-1">{label}</div>
      <div className="text-[13px] font-semibold text-[#0F172A] break-words">{value}</div>
    </div>
  );
}
