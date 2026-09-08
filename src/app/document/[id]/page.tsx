"use client";

import React from "react";
import useSWR from "swr";
import DocumentSplitViewer from "@/components/DocumentSplitViewer";
import Link from "next/link";
import { FileLock2 } from "lucide-react";
import type { DocumentItem } from "@/lib/mockData";

// Deliberately does NOT read from usePsi()'s `allDocuments` (that list is an
// established, unfiltered exception for cross-location benchmarking widgets only —
// see CLAUDE.md). Looking up a single document by id needs the real RBAC check, so
// this fetches GET /api/documents/[id] directly, which 403s/404s server-side for a
// document outside the caller's location instead of trusting the client to have
// filtered correctly.
const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : null));

export default function DocumentDetailPage({ params }: { params: { id: string } }) {
  const { data: doc, isLoading } = useSWR<DocumentItem | null>(`/api/documents/${params.id}`, fetcher);

  if (isLoading) {
    return <div className="py-14 text-center text-[12.5px] text-[#9a9da0]">Memuat dokumen…</div>;
  }

  if (!doc) {
    return (
      <div className="bg-white border border-[#C5CED3] rounded-[8px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_6px_rgba(15,23,42,.04)] py-[60px] px-5 text-center">
        <FileLock2 className="w-8 h-8 text-[#c3c6c9] mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-sm font-bold text-[#3a3d40] mb-1">Dokumen tidak ditemukan atau akses ditolak</p>
        <p className="text-[12.5px] text-[#9a9da0] mb-4">Dokumen mungkin tidak ada, atau berada di luar lokasi akses Anda.</p>
        <Link href="/directory" className="cursor-pointer text-[12.5px] font-bold text-[#0F3B59] hover:text-[#0B2C43]">
          ← Kembali ke Direktori
        </Link>
      </div>
    );
  }

  // Keyed by doc.id so navigating between two /document/[id] URLs (which Next.js
  // otherwise reuses the same component instance for, since it's the same route
  // pattern) fully remounts the viewer — resetting active tab, expanded history
  // rows, and any in-progress approve/reject comment draft instead of carrying
  // them over from whatever document was last viewed.
  return <DocumentSplitViewer document={doc} key={doc.id} />;
}
