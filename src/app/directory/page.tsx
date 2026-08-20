"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { usePsi } from "@/lib/psiStore";
import { Search, ArrowUp, ArrowDown, ChevronsUpDown, Eye, CheckCircle2 } from "lucide-react";
import UpdateTypeBadge from "@/components/UpdateTypeBadge";
import DocumentPreviewModal from "@/components/DocumentPreviewModal";
import { DocumentItem } from "@/lib/mockData";

type SortKey = "issueDate" | "expiryDate" | "location" | "psiType" | "title" | "documentNumber" | "status" | "currentVersion";

const STATUS_META: Record<string, { color: string; tint: string }> = {
  Approved: { color: "#15803D", tint: "#DCFCE7" },
  "In Routing": { color: "#B45309", tint: "#FEF3C7" },
  "Revision Required": { color: "#6D28D9", tint: "#EDE9FE" },
  Expired: { color: "#DC2626", tint: "#FEE2E2" },
};

function fmtDate(iso: string) {
  if (!iso) return "-";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function DirectoryContent() {
  const { documents } = usePsi();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("issueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  const handleDownload = (doc: DocumentItem) => {
    setDownloadToast(`Mengunduh berkas v${doc.currentVersion} (${doc.fileUrl.split("/").pop()}) — simulasi.`);
    setTimeout(() => setDownloadToast(null), 2800);
  };

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearchTerm(q);
    const status = searchParams.get("status");
    if (status) setStatusFilter(status);
  }, [searchParams]);

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.documentNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sortedDocs = [...filteredDocs].sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "issueDate":
        cmp = new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime();
        break;
      case "expiryDate":
        cmp = new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        break;
      case "location":
        cmp = a.location.localeCompare(b.location);
        break;
      case "psiType":
        cmp = a.psiType.localeCompare(b.psiType);
        break;
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
      case "documentNumber":
        cmp = a.documentNumber.localeCompare(b.documentNumber);
        break;
      case "status":
        cmp = a.status.localeCompare(b.status);
        break;
      case "currentVersion":
        cmp = (parseFloat(a.currentVersion) || 0) - (parseFloat(b.currentVersion) || 0);
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ sortKey }: { sortKey: SortKey }) => {
    if (sortBy !== sortKey) return <ChevronsUpDown className="w-3 h-3 text-[#c3c6c9]" strokeWidth={2} />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-[#0369A1]" strokeWidth={2.2} /> : <ArrowDown className="w-3 h-3 text-[#0369A1]" strokeWidth={2.2} />;
  };

  const sortableHeaderClass = "flex items-center gap-1 hover:text-[#0F172A] transition-colors duration-150";

  return (
    <div>
      {downloadToast && (
        <div className="fixed bottom-6 right-6 z-[110] flex items-center gap-2 px-4 py-3 rounded-[2px] bg-[#DCFCE7] border border-[#BBF7D0] shadow-[0_8px_24px_rgba(0,0,0,.12)] animate-fadeInUp">
          <CheckCircle2 className="w-4 h-4 text-[#15803D] flex-shrink-0" strokeWidth={1.9} />
          <span className="text-[12.5px] font-semibold text-[#15803D]">{downloadToast}</span>
        </div>
      )}

      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
          onDownload={() => handleDownload(previewDoc)}
        />
      )}

      <div className="flex gap-2.5 mb-[18px] flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-[#9a9da0] absolute left-[11px] top-1/2 -translate-y-1/2" strokeWidth={1.8} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari judul atau nomor dokumen..."
            className="w-full min-h-[38px] pl-[34px] pr-3 py-1.5 text-[13px] border border-[#D6DEE8] rounded-[2px]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            const newParams = new URLSearchParams(searchParams.toString());
            if (e.target.value === "ALL") newParams.delete("status");
            else newParams.set("status", e.target.value);
            router.replace(`/directory?${newParams.toString()}`);
          }}
          className="text-[13px] px-2.5 py-1.5 border border-[#D6DEE8] rounded-[2px] bg-white font-semibold min-w-[170px]"
        >
          <option value="ALL">Semua Status</option>
          <option value="Approved">Approved</option>
          <option value="In Routing">In Routing</option>
          <option value="Revision Required">Revision Required</option>
          <option value="Expired">Expired</option>
        </select>
      </div>

      <div className="bg-white border border-[#D6DEE8] rounded-[2px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_6px_rgba(15,23,42,.04)] overflow-hidden">
        {sortedDocs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="bg-[#fafafb]">
                  <th className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">
                    <button type="button" onClick={() => toggleSort("documentNumber")} className={sortableHeaderClass}>No. Kasus <SortIcon sortKey="documentNumber" /></button>
                  </th>
                  <th className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">
                    <button type="button" onClick={() => toggleSort("title")} className={sortableHeaderClass}>Judul <SortIcon sortKey="title" /></button>
                  </th>
                  <th className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">
                    <button type="button" onClick={() => toggleSort("location")} className={sortableHeaderClass}>Lokasi <SortIcon sortKey="location" /></button>
                  </th>
                  <th className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">
                    <button type="button" onClick={() => toggleSort("psiType")} className={sortableHeaderClass}>Tipe PSI <SortIcon sortKey="psiType" /></button>
                  </th>
                  <th className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">
                    <div className="flex items-center gap-2.5">
                      <button type="button" onClick={() => toggleSort("issueDate")} className={sortableHeaderClass}>Terbit <SortIcon sortKey="issueDate" /></button>
                      <span className="text-[#d6d9dc] normal-case font-normal">/</span>
                      <button type="button" onClick={() => toggleSort("expiryDate")} className={sortableHeaderClass}>Expired <SortIcon sortKey="expiryDate" /></button>
                    </div>
                  </th>
                  <th className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">
                    <button type="button" onClick={() => toggleSort("currentVersion")} className={sortableHeaderClass}>Versi <SortIcon sortKey="currentVersion" /></button>
                  </th>
                  <th className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">
                    <button type="button" onClick={() => toggleSort("status")} className={sortableHeaderClass}>Status <SortIcon sortKey="status" /></button>
                  </th>
                  <th className="text-left px-3.5 py-2.5 text-[10.5px] font-bold tracking-[.05em] text-[#9a9da0] uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sortedDocs.map((doc, i) => {
                  const meta = STATUS_META[doc.status] ?? { color: "#6b6e72", tint: "#eceded" };
                  return (
                    <tr
                      key={doc.id}
                      className="border-t border-[#f0f0f1] hover:bg-[#fafafb] hover:shadow-[inset_3px_0_0_#0369A1] transition-all duration-200 ease-out-expo animate-fadeInUp"
                      style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                    >
                      <td className="px-3.5 py-3 text-[#6b6e72] font-heading text-xs">{doc.documentNumber}</td>
                      <td className="px-3.5 py-3 max-w-[220px]">
                        <Link href={`/document/${doc.id}`} className="cursor-pointer font-semibold text-[#0F172A] hover:text-[#0369A1] transition-colors duration-200">{doc.title}</Link>
                      </td>
                      <td className="px-3.5 py-3">{doc.location}</td>
                      <td className="px-3.5 py-3 text-[#6b6e72]">{doc.psiType}</td>
                      <td className="px-3.5 py-3">
                        <div>{fmtDate(doc.issueDate)} <span className="text-[#9a9da0]">→</span> {fmtDate(doc.expiryDate)}</div>
                        <UpdateTypeBadge history={doc.history} />
                      </td>
                      <td className="px-3.5 py-3 tabular-nums">v{doc.currentVersion}</td>
                      <td className="px-3.5 py-3">
                        <span className="inline-flex items-center gap-[5px] text-[11px] font-bold px-2 py-[3px] rounded-[2px]" style={{ background: meta.tint, color: meta.color }}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="cursor-pointer flex items-center gap-1 text-xs font-semibold text-[#0369A1] hover:text-[#075985] transition-colors duration-200"
                          >
                            <Eye className="w-3.5 h-3.5" strokeWidth={1.9} />
                            Lihat
                          </button>
                          <Link href={`/document/${doc.id}`} className="cursor-pointer text-xs font-semibold text-[#0369A1] hover:text-[#075985] transition-colors duration-200">Riwayat &amp; Audit →</Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-14 px-5 text-center">
            <Search className="w-[30px] h-[30px] text-[#c3c6c9] mx-auto mb-2.5" strokeWidth={1.5} />
            <p className="text-[13px] text-[#9a9da0]">Tidak ada dokumen yang cocok dengan pencarian atau filter Anda.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DirectoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Memuat direktori...</div>}>
      <DirectoryContent />
    </Suspense>
  );
}
