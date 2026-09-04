"use client";

import React, { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { usePsi } from "@/lib/psiStore";
import { DocumentStatus, isDocOverdue } from "@/lib/mockData";
import { DOCUMENT_STATUS_META } from "@/lib/domain/statusStyle";

gsap.registerPlugin(useGSAP);

// Same order as before ("Perlu Revisi" is this widget's own label for
// Revision Required, kept distinct from statusStyle's generic label).
const STATUS_ORDER: { key: DocumentStatus; label: string }[] = [
  { key: "Approved", label: "Approved" },
  { key: "In Routing", label: "In Routing" },
  { key: "Revision Required", label: "Perlu Revisi" },
  { key: "Expired", label: "Expired" },
  { key: "Draft", label: "Draft" },
];
const STATUS_META = STATUS_ORDER.map((s) => ({ ...s, color: DOCUMENT_STATUS_META[s.key].color }));

export default function StatusOverview() {
  const { documents } = usePsi();
  const [hoverKey, setHoverKey] = useState<DocumentStatus | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // A document overdue by date but not yet flagged "Expired" in its stored status
  // (e.g. still "Approved") counts as Expired here — same rule as the "Overdue" nav
  // badge / KPI card / dilemma table, so this breakdown can't quietly disagree with them.
  const effectiveStatus = (d: (typeof documents)[number]): DocumentStatus => (isDocOverdue(d) ? "Expired" : d.status);

  const total = documents.length;
  let cumPct = 0;
  const segments = STATUS_META.map((m) => {
    const count = documents.filter((d) => effectiveStatus(d) === m.key).length;
    return { ...m, count, pct: total > 0 ? (count / total) * 100 : 0 };
  })
    .filter((s) => s.count > 0)
    .map((s) => {
      const seg = { ...s, offset: cumPct };
      cumPct += s.pct;
      return seg;
    });

  const hovered = segments.find((s) => s.key === hoverKey) ?? null;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // fromTo, not from() — see KpiSummaryCards for why (StrictMode double-invoke).
        gsap.fromTo(
          ".status-segment",
          { scaleX: 0, transformOrigin: "left center" },
          { scaleX: 1, transformOrigin: "left center", duration: 0.6, ease: "power3.out", stagger: 0.06 }
        );
      });
      return () => mm.revert();
    },
    { scope: barRef, dependencies: [total] }
  );

  return (
    <div className="bg-white border border-[#D6DEE8] rounded-[8px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_6px_rgba(15,23,42,.04)] p-4 mb-3.5 transition-all duration-300 ease-out-expo hover:shadow-[0_4px_16px_rgba(0,0,0,.07)]">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-x-3 gap-y-1">
        <div>
          <h3 className="text-[13px] font-bold text-[#0F172A]">Distribusi Status</h3>
        </div>
        <span className="text-[11px] font-semibold text-[#6b6e72]">{total} dokumen total</span>
      </div>

      {/* Tooltip lives in this outer, non-clipping wrapper — the bar row below needs its
          own overflow-hidden to keep segments inside the rounded-pill shape, and anything
          absolutely positioned inside an overflow-hidden ancestor gets clipped with it. */}
      <div className="relative">
        <div ref={barRef} className="flex h-[22px] rounded-[8px] overflow-hidden gap-[2px] bg-[#eceded]">
          {segments.map((seg) => (
            <div
              key={seg.key}
              className="status-segment h-full cursor-pointer transition-[filter] duration-150"
              style={{
                width: `${seg.pct}%`,
                background: seg.color,
                filter: hoverKey && hoverKey !== seg.key ? "opacity(0.55)" : "opacity(1)",
              }}
              onMouseEnter={() => setHoverKey(seg.key)}
              onMouseLeave={() => setHoverKey(null)}
            />
          ))}
        </div>

        {hovered && (
          <div
            className="absolute bottom-full mb-2 z-20 bg-white border border-[#D6DEE8] rounded-[8px] shadow-[0_8px_20px_rgba(0,0,0,.15)] px-2.5 py-1.5 whitespace-nowrap animate-popIn pointer-events-none -translate-x-1/2"
            // Clamped away from the 0/100% edges — centered on a segment near either
            // end otherwise pushes half the (whitespace-nowrap) tooltip content past
            // the bar's own bounds, wide enough on a narrow viewport to force the
            // whole page to scroll horizontally for as long as it's open. 30/70 (not
            // 15/85) because the longest label ("Revision Required — 2 (18%)") is wide
            // enough that a 15%-from-edge anchor still overflowed a 375px viewport.
            style={{ left: `${Math.min(Math.max(hovered.offset + hovered.pct / 2, 30), 70)}%` }}
          >
            <span className="text-[11.5px] font-bold text-[#0F172A]">{hovered.label}</span>
            <span className="text-[11px] text-[#6b6e72]"> — {hovered.count} ({Math.round(hovered.pct)}%)</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3.5">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className="flex items-center gap-1.5 text-[12px] cursor-pointer"
            onMouseEnter={() => setHoverKey(seg.key)}
            onMouseLeave={() => setHoverKey(null)}
          >
            <span className="w-2 h-[3px] rounded-full flex-shrink-0" style={{ background: seg.color }} />
            <span className="font-semibold text-[#3a3d40]">{seg.label}</span>
            <span className="font-mono text-[#9a9da0] tabular-nums">{seg.count} · {Math.round(seg.pct)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
