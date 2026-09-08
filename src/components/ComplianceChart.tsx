"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { usePsi } from "@/lib/psiStore";
import { BarChart3, MapPin } from "lucide-react";
import StatusTag from "@/components/StatusTag";

gsap.registerPlugin(useGSAP);

const PSI_TYPES = [
  "Informasi Bahan Berbahaya",
  "Informasi Teknologi Proses",
  "Informasi Peralatan",
  "Sistem Tata Kerja",
] as const;

function barColor(pct: number) {
  if (pct >= 100) return "#15803D";
  if (pct >= 80) return "#16A34A";
  if (pct >= 50) return "#B45309";
  return "#DC2626";
}

function statusLabel(pct: number) {
  if (pct >= 100) return "Tercapai";
  if (pct >= 80) return "Hampir Tercapai";
  if (pct >= 50) return "Dalam Proses";
  return "Kritis";
}

// Unfilled meter track echoes the fill's own severity hue at low opacity, so the
// whole bar reads as one state (per-row color, not a neutral gray for every row).
function trackTint(pct: number) {
  return `${barColor(pct)}22`;
}

export default function ComplianceChart() {
  const {
    activeUser,
    locations,
    selectedLocationFilter,
    effectiveLocationFilter,
    setSelectedLocationFilter,
    selectedTypeFilter,
    setSelectedTypeFilter,
    getComplianceMetrics,
    documents,
  } = usePsi();

  // Admin Regional compares across all 5 terminals — that's the whole point of the
  // role. Everyone else only ever has one location, so the "Semua Lokasi/Terminal"
  // filter and the per-location breakdown table it drives have nothing to compare
  // against and are just dead UI for them (see effectiveLocationFilter in
  // psiStore.tsx, which is what actually clamps the numbers below to their location
  // regardless of this flag).
  const isAdmin = activeUser.isRegionalAdmin;

  const metrics = getComplianceMetrics();
  const overallGap = Math.max(0, metrics.totalTarget - metrics.totalApproved);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (metrics.percentage / 100) * circumference;
  const strokeColor = metrics.percentage >= 80 ? "#15803D" : metrics.percentage >= 50 ? "#B45309" : "#DC2626";
  const badgeColor = metrics.percentage >= 80 ? "#15803D" : "#B45309";
  const badgeLabel = metrics.percentage >= 80 ? "Memenuhi Standar" : "Perlu Dilengkapi";

  // Worst-first so the panel leads with what actually needs attention, not filing
  // order. Filtered before sort so a single-location/type view stays stable.
  const typeCompliance = PSI_TYPES.map((type) => ({ type, data: metrics.byType[type] }))
    .filter((t) => t.data && (selectedTypeFilter === "ALL" || selectedTypeFilter === t.type))
    .sort((a, b) => a.data.pct - b.data.pct);

  const locationCompliance = locations
    .map((loc) => {
      const locDocs = documents.filter((d) => d.location === loc.locationName);
      const approved = locDocs.filter((d) => d.status === "Approved").length;
      const totalTarget = Object.values(loc.targets).reduce((sum, t) => sum + t, 0);
      const pct = totalTarget > 0 ? Math.min(100, Math.round((approved / totalTarget) * 100)) : 0;
      return { name: loc.locationName, approved, totalTarget, pct };
    })
    .filter((loc) => effectiveLocationFilter === "ALL" || loc.name === effectiveLocationFilter)
    .sort((a, b) => a.pct - b.pct);

  const gaugeRef = useRef<SVGCircleElement>(null);
  useGSAP(
    () => {
      if (!gaugeRef.current) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(gaugeRef.current, { strokeDashoffset, duration: 0.9, ease: "power3.out" });
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(gaugeRef.current, { strokeDashoffset });
      });
      return () => mm.revert();
    },
    { dependencies: [strokeDashoffset] }
  );

  return (
    <div className="relative bg-white border border-[#C5CED3] rounded-[8px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_6px_rgba(15,23,42,.04)] p-4 transition-shadow duration-300 ease-out-expo hover:shadow-[0_4px_16px_rgba(0,0,0,.07)]">
      <div className="flex items-start justify-between gap-3 pb-3 mb-3.5 border-b border-[#eceded] flex-wrap">
        <div>
          <h2 className="text-[13px] font-bold text-[#0F172A] flex items-center gap-2">
            <BarChart3 className="w-[15px] h-[15px] text-[#0F3B59]" strokeWidth={1.7} />
            <span>Kalkulasi Kepatuhan Dokumen PSI</span>
          </h2>
        </div>

        {/* min-w-0 lets each <select> shrink below its longest-option natural width
            (a <select>'s intrinsic width follows its content otherwise, which is
            what pushed this row past a narrow viewport — flex-wrap alone doesn't
            help an item that refuses to shrink in the first place) */}
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {isAdmin && (
            <select
              value={selectedLocationFilter}
              onChange={(e) => setSelectedLocationFilter(e.target.value)}
              className="flex-1 min-w-0 sm:flex-initial text-xs px-2 py-1.5 border border-[#C5CED3] rounded-[8px] bg-white font-semibold transition-colors duration-200 hover:border-[#9a9da0] cursor-pointer"
            >
              <option value="ALL">Semua Lokasi / Terminal</option>
              {locations.map((l) => (
                <option key={l.locationName} value={l.locationName}>{l.locationName}</option>
              ))}
            </select>
          )}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="flex-1 min-w-0 sm:flex-initial text-xs px-2 py-1.5 border border-[#C5CED3] rounded-[8px] bg-white font-semibold transition-colors duration-200 hover:border-[#9a9da0] cursor-pointer"
          >
            <option value="ALL">Semua Jenis PSI</option>
            {PSI_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary strip — gauge + the three headline numbers in one horizontal row,
          instead of a narrow sidebar next to a much wider table stack. */}
      <div className="flex items-center gap-5 bg-[#f7f8f8] border border-[#eceded] rounded-[8px] px-5 py-3.5 mb-4 flex-wrap">
        <div className="relative w-[72px] h-[72px] flex-shrink-0">
          <svg viewBox="0 0 128 128" width="72" height="72" className="-rotate-90">
            <circle cx="64" cy="64" r={radius} fill="none" stroke="#eceded" strokeWidth="14" />
            <circle
              ref={gaugeRef}
              cx="64" cy="64" r={radius} fill="none" stroke={strokeColor} strokeWidth="14" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={circumference}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-heading text-[16px] font-bold">{metrics.percentage}%</span>
          </div>
        </div>

        <div className="leading-tight">
          <div className="text-[10px] font-bold tracking-[.08em] text-[#6b6e72] uppercase">Kepatuhan Keseluruhan</div>
        </div>

        <div className="hidden md:block w-px h-10 bg-[#e2e5e9]" />

        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <div className="text-[10px] font-bold tracking-[.06em] text-[#9a9da0] uppercase mb-0.5">Approved</div>
            <div className="font-heading text-[19px] font-bold text-[#15803D]">{metrics.totalApproved}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-[.06em] text-[#9a9da0] uppercase mb-0.5">Target</div>
            <div className="font-heading text-[19px] font-bold text-[#0F172A]">{metrics.totalTarget}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-[.06em] text-[#9a9da0] uppercase mb-0.5">Kekurangan</div>
            <div className="font-heading text-[19px] font-bold" style={{ color: overallGap > 0 ? "#DC2626" : "#15803D" }}>{overallGap}</div>
          </div>
        </div>

        <div className="ml-auto flex-shrink-0">
          <StatusTag color={badgeColor} label={badgeLabel} />
        </div>
      </div>

      {/* Both breakdown tables are Admin-Regional-only — dropped entirely for a
          location-scoped user, not just re-filtered down to a near-empty state.
          The per-location table was an obvious case (one row, nothing to compare).
          The per-Jenis-PSI table turned out to be one too, on user feedback: with a
          single location's small per-type targets (e.g. target=2), almost every row
          reads "Kritis" from the very first document — a threshold calibrated for
          comparing terminals against each other, not for a brand-new location's
          natural early-stage numbers. The gauge/summary strip above already covers
          "how is my location doing overall" without that false-alarm framing. */}
      {isAdmin && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="min-w-0 overflow-x-auto">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-[7px]">
              <BarChart3 className="w-[13px] h-[13px] text-[#0F3B59]" strokeWidth={1.8} />
              <span className="text-[11px] font-bold tracking-[.06em] text-[#3a3d40] uppercase">Kelengkapan per Jenis PSI</span>
            </div>
            <span className="text-[10px] text-[#9a9da0] whitespace-nowrap">
              <span className="text-[#16A34A] font-bold">●</span> ≥80%
              <span className="text-[#B45309] font-bold ml-2">●</span> 50–79%
              <span className="text-[#DC2626] font-bold ml-2">●</span> &lt;50%
            </span>
          </div>
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr>
                <th className="text-left text-[10px] font-bold tracking-[.05em] text-[#9a9da0] uppercase pb-1.5">Jenis PSI</th>
                <th className="text-left text-[10px] font-bold tracking-[.05em] text-[#9a9da0] uppercase pb-1.5">Capaian</th>
                <th className="text-left text-[10px] font-bold tracking-[.05em] text-[#9a9da0] uppercase pb-1.5">Sisa</th>
                <th className="text-left text-[10px] font-bold tracking-[.05em] text-[#9a9da0] uppercase pb-1.5 w-[26%]">Progres</th>
                <th className="text-right text-[10px] font-bold tracking-[.05em] text-[#9a9da0] uppercase pb-1.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {typeCompliance.map(({ type, data }) => {
                const gap = Math.max(0, data.target - data.approved);
                return (
                  <tr key={type} className="border-t border-[#f0f0f1]">
                    <td className="py-2 pr-2 font-semibold">{type}</td>
                    <td className="py-2 text-[#6b6e72] font-mono tabular-nums whitespace-nowrap"><strong className="text-[#0F172A]">{data.approved}</strong> / {data.target}</td>
                    <td className="py-2 font-mono tabular-nums font-semibold" style={{ color: gap > 0 ? "#DC2626" : "#15803D" }}>{gap > 0 ? gap : "—"}</td>
                    <td className="py-2">
                      <div className="h-[5px] rounded-full overflow-hidden" style={{ background: trackTint(data.pct) }}>
                        <div className="h-full rounded-full transition-all duration-700 ease-out-expo" style={{ background: barColor(data.pct), width: `${data.pct}%` }} />
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <StatusTag color={barColor(data.pct)} label={`${data.pct}% · ${statusLabel(data.pct)}`} size="sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="min-w-0 overflow-x-auto">
          <div className="flex items-center gap-[7px] mb-2">
            <MapPin className="w-[13px] h-[13px] text-[#15803D]" strokeWidth={1.8} />
            <span className="text-[11px] font-bold tracking-[.06em] text-[#3a3d40] uppercase">Kelengkapan per Lokasi / Terminal</span>
          </div>
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr>
                <th className="text-left text-[10px] font-bold tracking-[.05em] text-[#9a9da0] uppercase pb-1.5">Lokasi</th>
                <th className="text-left text-[10px] font-bold tracking-[.05em] text-[#9a9da0] uppercase pb-1.5">Capaian</th>
                <th className="text-left text-[10px] font-bold tracking-[.05em] text-[#9a9da0] uppercase pb-1.5">Sisa</th>
                <th className="text-left text-[10px] font-bold tracking-[.05em] text-[#9a9da0] uppercase pb-1.5 w-[26%]">Progres</th>
                <th className="text-right text-[10px] font-bold tracking-[.05em] text-[#9a9da0] uppercase pb-1.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {locationCompliance.map((loc) => {
                const gap = Math.max(0, loc.totalTarget - loc.approved);
                return (
                  <tr key={loc.name} className="border-t border-[#f0f0f1]">
                    <td className="py-2 pr-2 font-semibold">{loc.name}</td>
                    <td className="py-2 text-[#6b6e72] font-mono tabular-nums whitespace-nowrap"><strong className="text-[#0F172A]">{loc.approved}</strong> / {loc.totalTarget}</td>
                    <td className="py-2 font-mono tabular-nums font-semibold" style={{ color: gap > 0 ? "#DC2626" : "#15803D" }}>{gap > 0 ? gap : "—"}</td>
                    <td className="py-2">
                      <div className="h-[5px] rounded-full overflow-hidden" style={{ background: trackTint(loc.pct) }}>
                        <div className="h-full rounded-full transition-all duration-700 ease-out-expo" style={{ background: barColor(loc.pct), width: `${loc.pct}%` }} />
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <StatusTag color={barColor(loc.pct)} label={`${loc.pct}% · ${statusLabel(loc.pct)}`} size="sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}
