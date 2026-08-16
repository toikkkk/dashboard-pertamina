"use client";

import React from "react";
import { usePsi } from "@/lib/psiStore";
import { CheckCircle, AlertTriangle, BarChart3, Filter, MapPin, Layers } from "lucide-react";

export default function ComplianceChart() {
  const {
    locations,
    selectedLocationFilter,
    setSelectedLocationFilter,
    selectedTypeFilter,
    setSelectedTypeFilter,
    getComplianceMetrics,
    documents,
  } = usePsi();

  const metrics = getComplianceMetrics();

  const psiTypes = [
    "Informasi Bahan Berbahaya",
    "Informasi Teknologi Proses",
    "Informasi Peralatan",
    "Sistem Tata Kerja",
  ] as const;

  const getBarColor = (pct: number) => {
    if (pct === 100) return "bg-[#2E7D32]";
    if (pct >= 80) return "bg-[#4CAF50]";
    if (pct >= 50) return "bg-amber-500";
    return "bg-[#D32F2F]";
  };

  const getStrokeColor = (pct: number) => {
    if (pct === 100) return "#2E7D32";
    if (pct >= 80) return "#4CAF50";
    if (pct >= 50) return "#F59E0B";
    return "#D32F2F";
  };

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (metrics.percentage / 100) * circumference;

  const locationCompliance = locations.map((loc) => {
    const locDocs = documents.filter((d) => d.location === loc.locationName);
    const approved = locDocs.filter((d) => d.status === "Approved").length;
    const totalTarget = Object.values(loc.targets).reduce((sum, t) => sum + t, 0);
    const pct = totalTarget > 0 ? Math.min(100, Math.round((approved / totalTarget) * 100)) : 0;
    return { name: loc.locationName, region: loc.region, approved, totalTarget, pct, count: locDocs.length };
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#D9D9D9] p-4 sm:p-5 space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#D9D9D9]">
        <div>
          <h2 className="text-base font-black text-[#284B63] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#3C6E71]" />
            <span>Kalkulasi Kepatuhan Dokumen PSI</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Persentase dihitung dari jumlah dokumen yang sudah disetujui dibanding target dokumen yang ditetapkan, per Lokasi & per Jenis PSI.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-[#D9D9D9]/80 text-xs">
          <div className="flex items-center gap-1 text-slate-600 font-bold pl-1.5">
            <Filter className="w-3.5 h-3.5 text-[#284B63]" />
            <span>Filter:</span>
          </div>

          <select
            value={selectedLocationFilter}
            onChange={(e) => setSelectedLocationFilter(e.target.value)}
            className="border border-[#D9D9D9] rounded-md px-2.5 py-1 bg-white font-bold text-[#353535] focus:outline-none focus:ring-2 focus:ring-[#284B63]"
          >
            <option value="ALL">Semua Lokasi / Terminal</option>
            {locations.map((l) => (
              <option key={l.locationName} value={l.locationName}>
                {l.locationName} ({l.region})
              </option>
            ))}
          </select>

          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="border border-[#D9D9D9] rounded-md px-2.5 py-1 bg-white font-bold text-[#353535] focus:outline-none focus:ring-2 focus:ring-[#284B63]"
          >
            <option value="ALL">Semua Jenis PSI</option>
            {psiTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid Layout: Gauge + tabel breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Overall Gauge Chart */}
        <div className="lg:col-span-3 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-[#D9D9D9]">
          <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-wider mb-2 text-center">
            Kepatuhan Keseluruhan
          </h3>

          <div className="relative w-32 h-32 flex items-center justify-center my-1">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="64" cy="64" r={radius} className="text-slate-200" strokeWidth="12" stroke="currentColor" fill="transparent" />
              <circle
                cx="64"
                cy="64"
                r={radius}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke={getStrokeColor(metrics.percentage)}
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black font-mono text-[#353535] tracking-tight">{metrics.percentage}%</span>
              <span className="text-[9px] font-extrabold text-slate-500 uppercase">Readiness</span>
            </div>
          </div>

          <div className="mt-2 text-center text-[11px] space-y-1 w-full">
            <div className="flex items-center justify-between px-2.5 py-1 bg-white rounded-md border border-[#D9D9D9] text-slate-700 font-semibold">
              <span>Approved:</span>
              <span className="font-mono font-bold text-emerald-700">{metrics.totalApproved}</span>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1 bg-white rounded-md border border-[#D9D9D9] text-slate-700 font-semibold">
              <span>Target:</span>
              <span className="font-mono font-bold text-[#353535]">{metrics.totalTarget}</span>
            </div>
          </div>

          <div className="mt-2 w-full text-center">
            <div
              className={`text-[10px] font-extrabold p-1.5 rounded-lg border flex items-center justify-center gap-1 ${
                metrics.percentage >= 80 ? "bg-emerald-100 text-emerald-900 border-emerald-300" : "bg-amber-100 text-amber-900 border-amber-300"
              }`}
            >
              {metrics.percentage >= 80 ? (
                <>
                  <CheckCircle className="w-3 h-3 flex-shrink-0" />
                  <span>Memenuhi Standar</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span>Perlu Dilengkapi</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Columns: dua tabel breakdown */}
        <div className="lg:col-span-9 space-y-4">
          {/* Tabel A: Breakdown per Jenis PSI */}
          <div className="border border-[#D9D9D9] rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-[#D9D9D9]">
              <Layers className="w-3.5 h-3.5 text-[#3C6E71]" />
              <h3 className="text-[11px] font-extrabold text-[#284B63] uppercase tracking-wider">
                Kelengkapan per Jenis PSI
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400 font-bold">
                    <th className="px-3 py-1.5">Jenis PSI</th>
                    <th className="px-3 py-1.5">Capaian</th>
                    <th className="px-3 py-1.5 w-1/3">Progres</th>
                    <th className="px-3 py-1.5 text-right">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {psiTypes.map((type) => {
                    const data = metrics.byType[type];
                    if (!data || (selectedTypeFilter !== "ALL" && selectedTypeFilter !== type)) return null;
                    return (
                      <tr key={type} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-3 py-2 font-bold text-[#353535]">{type}</td>
                        <td className="px-3 py-2 text-slate-500 font-mono whitespace-nowrap">
                          <strong className="text-[#353535]">{data.approved}</strong> / {data.target}
                        </td>
                        <td className="px-3 py-2">
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${getBarColor(data.pct)}`} style={{ width: `${data.pct}%` }} />
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-black text-[#284B63]">{data.pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabel B: Breakdown per Lokasi */}
          <div className="border border-[#D9D9D9] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-[#D9D9D9]">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#2E7D32]" />
                <h3 className="text-[11px] font-extrabold text-[#284B63] uppercase tracking-wider">
                  Kelengkapan per Lokasi / Terminal ({selectedLocationFilter === "ALL" ? "Regional Jatimbalinus" : selectedLocationFilter})
                </h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400 font-bold">
                    <th className="px-3 py-1.5">Lokasi</th>
                    <th className="px-3 py-1.5">Capaian</th>
                    <th className="px-3 py-1.5 w-1/3">Progres</th>
                    <th className="px-3 py-1.5 text-right">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {locationCompliance
                    .filter((loc) => selectedLocationFilter === "ALL" || loc.name === selectedLocationFilter)
                    .map((loc) => (
                      <tr key={loc.name} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-3 py-2">
                          <span className="font-bold text-[#353535] block">{loc.name}</span>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">{loc.region}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-500 font-mono whitespace-nowrap">
                          <strong className="text-[#353535]">{loc.approved}</strong> / {loc.totalTarget}
                        </td>
                        <td className="px-3 py-2">
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${getBarColor(loc.pct)}`} style={{ width: `${loc.pct}%` }} />
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-black text-[#284B63]">{loc.pct}%</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
