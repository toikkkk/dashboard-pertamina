"use client";

// Hasil pencarian Direktori: toleran salah ketik (pencocokan yang sama dengan bilah atas),
// menampilkan jalur lengkap (Lokasi › Sub-dokumen) dan bisa disaring menurut status.
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { DocumentItem } from "@/lib/domain/types";
import { documentMatchScore } from "@/lib/domain/docSearch";
import { isDocOverdue } from "@/lib/domain/rules";
import StatusTag from "@/components/StatusTag";
import { DOCUMENT_STATUS_META } from "@/lib/domain/statusStyle";

type StatusFilter = "semua" | "berlaku" | "kedaluwarsa";
const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "berlaku", label: "Berlaku" },
  { key: "kedaluwarsa", label: "Kedaluwarsa" },
];
const LIMIT = 100;

const fmtDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

export default function SearchResults({ query, docs }: { query: string; docs: DocumentItem[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusFilter>("semua");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return docs
      .map((doc) => ({ doc, score: documentMatchScore(q, doc) }))
      .filter((r) => r.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.doc);
  }, [query, docs]);

  const filtered = results.filter((d) => status === "semua" || (status === "kedaluwarsa") === isDocOverdue(d));

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h2 className="font-heading text-[16px] font-bold text-[#0F172A]">
          Hasil untuk “{query.trim()}” <span className="font-mono text-[12px] font-normal text-[#6b6e72]">{filtered.length}</span>
        </h2>
        <div role="radiogroup" aria-label="Saring status" className="flex items-center gap-1 p-0.5 rounded-[8px] bg-[#F0F2F3] border border-[#E2E8EB]">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="radio"
              aria-checked={status === f.key}
              onClick={() => setStatus(f.key)}
              className={`px-2.5 py-1.5 rounded-[6px] text-[11.5px] font-bold transition-colors duration-150 ${status === f.key ? "bg-white text-[#0F3B59] shadow-[0_1px_2px_rgba(15,23,42,.08)]" : "text-[#6b6e72] hover:text-[#0F172A]"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {query.trim().length < 2 ? (
        <p className="py-14 text-center text-[13px] text-[#9a9da0]">Ketik minimal 2 huruf.</p>
      ) : filtered.length === 0 ? (
        <p className="py-14 text-center text-[13px] text-[#9a9da0]">Tidak ada dokumen yang cocok.</p>
      ) : (
        <div className="bg-white border border-[#D8E1E4] rounded-[14px] overflow-hidden">
          {filtered.slice(0, LIMIT).map((d) => {
            const overdue = isDocOverdue(d);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => router.push(`/document/${d.id}`)}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left border-b border-[#EEF2F4] last:border-b-0 hover:bg-[#F5F7F9] transition-colors duration-150"
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-[#0F172A] truncate">{d.title}</div>
                  <div className="text-[11px] text-[#6b6e72] truncate">
                    {d.location}{d.categoryName ? ` › ${d.categoryName}` : ""} · <span className="font-mono">{d.documentNumber}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[11px] font-mono tabular-nums text-[#9a9da0] hidden sm:inline">terbit {fmtDate(d.issueDate)}</span>
                  <StatusTag color={overdue ? DOCUMENT_STATUS_META.Expired.color : DOCUMENT_STATUS_META.Approved.color} label={overdue ? "Kedaluwarsa" : "Berlaku"} size="sm" />
                  <ChevronRight className="w-4 h-4 text-[#c3c6c9]" strokeWidth={2} />
                </div>
              </button>
            );
          })}
        </div>
      )}
      {filtered.length > LIMIT && <p className="mt-3 text-center text-[12px] text-[#9a9da0]">Menampilkan {LIMIT} teratas — persempit pencarian untuk hasil lebih tepat.</p>}
    </div>
  );
}
