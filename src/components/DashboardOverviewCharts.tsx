"use client";

import React from "react";
import { usePsi } from "@/lib/psiStore";
import { PieChart } from "lucide-react";
import { DocumentStatus } from "@/lib/mockData";

// Warna status divalidasi dengan scripts/validate_palette.js skill dataviz (PASS, satu WARN
// pada pasangan hijau/amber untuk protanopia — makanya tiap segmen selalu diberi label teks,
// tidak mengandalkan warna saja). Sama dengan palet status yang sudah dipakai di seluruh app.
const STATUS_META: { key: DocumentStatus; label: string; color: string }[] = [
  { key: "Approved", label: "Approved (Valid)", color: "#2E7D32" },
  { key: "In Routing", label: "Dalam Sirkuler", color: "#D97706" },
  { key: "Revision Required", label: "Perlu Revisi", color: "#6B21A8" },
  { key: "Expired", label: "Overdue", color: "#D32F2F" },
];

export default function DashboardOverviewCharts() {
  const { documents } = usePsi();

  const total = documents.length;
  const statusCounts = STATUS_META.map((s) => ({
    ...s,
    count: documents.filter((d) => d.status === s.key).length,
  }));
  const nonZeroCount = statusCounts.filter((s) => s.count > 0).length;

  // Donut geometry — segmen digambar dengan stroke-dasharray di atas lingkaran dasar,
  // dengan celah kecil antar-segmen (mark spec skill dataviz).
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const gap = nonZeroCount > 1 ? 4 : 0;
  let cumulative = 0;
  const donutSegments = statusCounts.map((s) => {
    const fraction = total > 0 ? s.count / total : 0;
    const rawDash = fraction * circumference;
    const dash = Math.max(0, rawDash - gap);
    const seg = { ...s, dash, offset: -cumulative, fraction };
    cumulative += rawDash;
    return seg;
  });

  return (
    <div className="bg-white p-4 rounded-xl border border-[#D9D9D9] shadow-sm space-y-3">
      <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-2">
        <h3 className="text-[13px] font-bold text-slate-700 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-[#3C6E71]" />
          <span>Distribusi Status Dokumen</span>
        </h3>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-5">
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
            <circle cx="64" cy="64" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="16" />
            {donutSegments.map((s) => (
              s.count > 0 && (
                <circle
                  key={s.key}
                  cx="64" cy="64" r={radius} fill="none"
                  stroke={s.color}
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray={`${s.dash} ${circumference - s.dash}`}
                  strokeDashoffset={s.offset}
                  className="transition-all duration-700"
                >
                  <title>{`${s.label}: ${s.count} dokumen (${Math.round(s.fraction * 100)}%)`}</title>
                </circle>
              )
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-black text-[#353535] font-mono">{total}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase">Total</span>
          </div>
        </div>

        <div className="flex-1 w-full grid grid-cols-2 gap-x-3 gap-y-1.5">
          {statusCounts.map((s) => {
            const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
            return (
              <div key={s.key} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-700 font-semibold truncate">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="truncate">{s.label}</span>
                </span>
                <span className="font-mono font-bold text-[#353535] flex-shrink-0 pl-1">{s.count} <span className="text-slate-400 font-sans font-medium">({pct}%)</span></span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
