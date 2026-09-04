"use client";

// Shared "no built-in preview" fallback for a curated DocumentItem — used as the
// `fallback` prop wherever DocumentContentPreview is rendered for a document (both
// DocumentSplitViewer's "Detail Dokumen" tab and DocumentPreviewModal). Plain
// metadata grid, all real DocumentItem fields, nothing fabricated — previously this
// rendered a simulated letterhead + fake "TERVERIFIKASI · PKI" stamp, then an amber
// "berkas belum tersedia" warning banner on top of the grid — both dropped per
// explicit feedback; the grid alone reads cleanly without needing to call out what
// it *isn't*.
import React from "react";
import { DocumentItem } from "@/lib/mockData";

function fmtDate(iso: string) {
  if (!iso) return "-";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default function DocumentMetadataFallback({ document: doc }: { document: DocumentItem }) {
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-4 bg-[#fafafb] border border-[#eceded] rounded-[8px] p-6">
      <InfoField label="No. Dokumen" value={doc.documentNumber} />
      <InfoField label="Jenis PSI" value={doc.psiType} />
      <InfoField label="Judul" value={doc.title} span />
      <InfoField label="Lokasi" value={doc.location} />
      <InfoField label="Versi Berlaku" value={`v${doc.currentVersion}`} />
      <InfoField label="Tanggal Terbit" value={fmtDate(doc.issueDate)} />
      <InfoField label="Berlaku s.d." value={fmtDate(doc.expiryDate)} />
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
