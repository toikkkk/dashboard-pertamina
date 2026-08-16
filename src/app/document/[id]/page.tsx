"use client";

import React from "react";
import { usePsi } from "@/lib/psiStore";
import DocumentSplitViewer from "@/components/DocumentSplitViewer";
import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function DocumentDetailPage({ params }: { params: { id: string } }) {
  const { allDocuments } = usePsi();
  const doc = allDocuments.find((d) => d.id === params.id);

  if (!doc) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-xl p-8 shadow border border-[#D9D9D9]">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[#284B63] mb-2">Dokumen Tidak Ditemukan atau Akses Ditolak</h2>
          <p className="text-xs text-slate-500 mb-6">
            Pastikan ID dokumen benar dan peran Anda (RBAC) memiliki hak akses untuk melihat dokumen pada lokasi fasilitas ini.
          </p>
          <Link href="/" className="inline-flex items-center gap-2 bg-[#284B63] text-white px-4 py-2 rounded font-semibold text-xs shadow hover:bg-[#1E3A4F]">
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return <DocumentSplitViewer document={doc} />;
}
