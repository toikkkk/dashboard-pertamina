"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { usePsi } from "@/lib/psiStore";
import {
  FileText, Search, Filter, Eye, Sparkles, FolderOpen, ArrowUpRight,
  Calendar, Clock, CheckCircle2, RefreshCw, AlertTriangle, Hourglass
} from "lucide-react";
import UpdateTypeBadge from "@/components/UpdateTypeBadge";

function DirectoryContent() {
  const { documents, activeUser } = usePsi();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return (
          <span className="px-2.5 py-1 rounded-full text-white text-[11px] font-bold bg-[#2E7D32] shadow-sm inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Approved (Valid)
          </span>
        );
      case "In Routing":
        return (
          <span className="px-2.5 py-1 rounded-full text-white text-[11px] font-bold bg-amber-600 shadow-sm inline-flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> In Routing
          </span>
        );
      case "Revision Required":
        return (
          <span className="px-2.5 py-1 rounded-full text-white text-[11px] font-bold bg-purple-800 shadow-sm inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Revision Required
          </span>
        );
      case "Expired":
        return (
          <span className="px-2.5 py-1 rounded-full text-white text-[11px] font-extrabold bg-[#D32F2F] shadow-sm inline-flex items-center gap-1 animate-pulse">
            <Hourglass className="w-3 h-3" /> Overdue
          </span>
        );
      default:
        return <span className="px-2.5 py-1 rounded-full text-white text-[11px] font-bold bg-blue-600">{status}</span>;
    }
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="bg-white rounded-xl shadow-sm border border-[#D9D9D9] p-4 sm:p-5 relative overflow-hidden animate-fadeIn">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#D9D9D9] mb-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#284B63] text-xs font-extrabold border border-blue-200 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Direktori Utama</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#284B63] flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-[#3C6E71]" />
              <span>Direktori Dokumen PSI & MOC ({activeUser.isRegionalAdmin ? "Regional Jatimbalinus" : activeUser.location})</span>
            </h2>
            <p className="text-xs text-slate-500">
              Menampilkan daftar berkas beserta tanggal update terakhir dan status sirkuler per lokasi fasilitas.
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-50/80 p-2 rounded-xl border border-[#D9D9D9]/80">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nomor atau judul dokumen..."
                className="pl-9 pr-3 py-2 border border-[#D9D9D9] rounded-lg bg-white w-full font-medium text-[#353535] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#284B63] transition shadow-inner"
              />
            </div>

            <div className="flex items-center gap-1 bg-white border border-[#D9D9D9] rounded-lg px-3 py-1.5 shadow-sm">
              <Filter className="w-3.5 h-3.5 text-[#284B63]" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  const newParams = new URLSearchParams(searchParams.toString());
                  if (e.target.value === "ALL") {
                    newParams.delete("status");
                  } else {
                    newParams.set("status", e.target.value);
                  }
                  router.replace(`/directory?${newParams.toString()}`);
                }}
                className="bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="Approved">Approved (Valid)</option>
                <option value="Expired">Overdue / Expired</option>
                <option value="In Routing">In Routing (Sirkuler)</option>
                <option value="Revision Required">Revision Required</option>
              </select>
            </div>
          </div>
        </div>

        {filteredDocs.length > 0 ? (
          <div className="overflow-x-auto -mx-6 sm:mx-0 px-6 sm:px-0">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-800 text-slate-100 uppercase tracking-wider font-extrabold text-[11px] border-b border-slate-700">
                  <th className="py-2 px-3 rounded-tl-lg">No. Kasus / Dokumen</th>
                  <th className="py-2 px-4">Judul Dokumen PSI</th>
                  <th className="py-2 px-3">Lokasi / Terminal</th>
                  <th className="py-2 px-3">Tipe PSI</th>
                  <th className="py-2 px-3">Tanggal Update</th>
                  <th className="py-2 px-2">Versi</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right rounded-tr-lg">Aksi & Riwayat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 border-x border-b border-[#D9D9D9] rounded-b-lg overflow-hidden">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="py-2 px-3 font-mono font-bold text-slate-700 group-hover:text-[#284B63]">{doc.documentNumber}</td>
                    <td className="py-2 px-4 font-extrabold text-[#284B63] text-sm group-hover:underline cursor-pointer">
                      <Link href={`/document/${doc.id}`}>
                        {doc.title}
                      </Link>
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-700">
                      <span className="bg-slate-100 text-[#353535] px-2 py-1 rounded font-semibold border border-[#D9D9D9]/80">
                        {doc.location}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-600">{doc.psiType}</td>
                    <td className="py-2 px-3 font-medium text-slate-700 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <span>{doc.issueDate}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 font-sans">
                        <Clock className="w-2.5 h-2.5" />
                        <span>Exp: {doc.expiryDate}</span>
                      </div>
                      <div className="mt-1">
                        <UpdateTypeBadge history={doc.history} />
                      </div>
                    </td>
                    <td className="py-2 px-2 font-mono font-bold text-center bg-slate-50 text-slate-700">v{doc.currentVersion}</td>
                    <td className="py-2 px-3">{getStatusBadge(doc.status)}</td>
                    <td className="py-2 px-3 text-right">
                      <Link
                        href={`/document/${doc.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#284B63] text-[#284B63] hover:bg-blue-50 active:scale-95 font-bold rounded-lg transition-all group/btn text-[11px]"
                      >
                        <Eye className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                        <span>Riwayat & Audit</span>
                        <ArrowUpRight className="w-3 h-3 opacity-70" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-[#D9D9D9] text-slate-500 text-sm">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
            <p className="font-bold text-slate-700">Tidak Ada Dokumen Sesuai Filter</p>
            <p className="text-xs mt-1 text-slate-500 max-w-sm mx-auto">
              Tidak ada dokumen yang cocok dengan kata kunci atau filter status pada wilayah otorisasi fasilitas Anda saat ini.
            </p>
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
