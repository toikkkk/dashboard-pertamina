"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { usePsi } from "@/lib/psiStore";
import { useRouter } from "next/navigation";
import { useCountUp } from "@/lib/useCountUp";
import { isDocOverdue } from "@/lib/mockData";

gsap.registerPlugin(useGSAP);

interface KpiCardDef {
  label: string;
  count: number;
  rate: number;
  path: string;
  color: string;
}

// One divided strip instead of four separate boxed cards — same internal-divider
// language ComplianceChart's summary strip already uses elsewhere on this dashboard.
// No icon-in-tinted-circle badge: that specific motif is the single most recognizable
// generic-admin-template tell, and the stat tile contract (label/value/delta) never
// called for one. Color is reserved for the number + meter fill; the label stays a
// neutral text token (text shouldn't wear the data color — only the mark should).
//
// Each cell shows only its own share (%), not "/ N total" — the total now lives once
// in the strip's own header (see KpiSummaryCards below) instead of repeated 4x, which
// was pure redundancy: the same "of 11" fact printed four times in a row taught the
// reader nothing new after the first read.
function KpiColumn({ card }: { card: KpiCardDef }) {
  const router = useRouter();
  const animatedCount = useCountUp(card.count, 700);

  return (
    <div
      onClick={() => router.push(card.path)}
      className="kpi-card flex-1 lg:min-w-[160px] bg-white p-4 lg:p-5 cursor-pointer transition-colors duration-200 hover:bg-[#fafafb]"
    >
      <div className="text-[10.5px] font-bold tracking-[.06em] uppercase text-[#6b6e72] mb-2.5">{card.label}</div>
      {/* Archivo (heading), not mono, on the hero value — a single standalone headline
          figure has no neighboring digits to align against, so tabular-nums/mono buys
          nothing here and just made the tile's one most prominent number look stiff
          next to everything else on the page. Mono stays reserved for real tabular
          contexts (table columns, document numbers) where digits actually line up. */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="font-heading text-[30px] font-bold leading-none" style={{ color: card.color }}>{animatedCount}</span>
        <span className="text-[12px] font-semibold text-[#9a9da0]">{card.rate}%</span>
      </div>
      <div className="h-[3px] bg-[#eceded] rounded-[1px] overflow-hidden">
        <div className="h-full transition-all duration-700 ease-out-expo" style={{ background: card.color, width: `${card.rate}%` }} />
      </div>
    </div>
  );
}

export default function KpiSummaryCards() {
  const { documents } = usePsi();
  const containerRef = useRef<HTMLDivElement>(null);

  const totalDocs = documents.length;
  // Overdue takes precedence: a doc stored as "Approved" whose expiryDate has already
  // passed belongs in "Kedaluwarsa", not double-counted into both buckets (see isDocOverdue).
  const approvedCount = documents.filter((d) => d.status === "Approved" && !isDocOverdue(d)).length;
  const overdueCount = documents.filter(isDocOverdue).length;
  const routingCount = documents.filter((d) => d.status === "In Routing" && !isDocOverdue(d)).length;
  const revisionCount = documents.filter((d) => d.status === "Revision Required" && !isDocOverdue(d)).length;

  const pct = (n: number) => (totalDocs > 0 ? Math.round((n / totalDocs) * 100) : 0);

  const cards: KpiCardDef[] = [
    { label: "Approved", count: approvedCount, rate: pct(approvedCount), path: "/directory?status=Approved", color: "#15803D" },
    { label: "Kedaluwarsa", count: overdueCount, rate: pct(overdueCount), path: "/dilemma", color: "#DC2626" },
    { label: "Dalam Sirkuler", count: routingCount, rate: pct(routingCount), path: "/directory?status=In+Routing", color: "#B45309" },
    { label: "Perlu Revisi", count: revisionCount, rate: pct(revisionCount), path: "/directory?status=Revision+Required", color: "#6D28D9" },
  ];

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // fromTo with explicit end values — gsap.from() infers "to" from each
        // element's current computed style, which under React StrictMode's
        // double-invoked effects can be a leftover mid-tween value from the
        // first (reverted) run, leaving cards stuck at partial opacity.
        gsap.fromTo(
          ".kpi-card",
          { opacity: 0, y: 14, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "power2.out", stagger: 0.07 }
        );
      });
      return () => mm.revert();
    },
    { scope: containerRef, dependencies: [totalDocs] }
  );

  return (
    <div className="bg-white border border-[#D6DEE8] rounded-[2px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_6px_rgba(15,23,42,.04)] mb-3.5">
      {/* Same header pattern every sibling widget on this dashboard already uses
          (title left, "N dokumen total" right) — this strip was the one widget
          without a title, which read as inconsistent next to Distribusi Status/
          Dokumen per Terminal/etc. right below it. */}
      <div className="flex items-baseline justify-between px-4 lg:px-5 pt-3.5 pb-3">
        <h3 className="text-[13px] font-bold text-[#0F172A]">Ringkasan Dokumen</h3>
        <span className="text-[11px] font-semibold text-[#6b6e72]">{totalDocs} dokumen total</span>
      </div>
      <div
        ref={containerRef}
        // 2x2 grid on mobile, single row on lg+ — same component either way, just the
        // container's flow direction changes. `gap-px bg-[#eceded]` draws the hairline
        // dividers (each card is opaque white, so the gap's background shows through
        // as a 1px line) instead of per-item border-l classes, which only made sense
        // for a single row and would've needed different logic entirely for a 2-column
        // grid's row dividers too.
        className="grid grid-cols-2 lg:flex gap-px bg-[#eceded] border-t border-[#D6DEE8] overflow-hidden rounded-b-[2px]"
      >
        {cards.map((c) => (
          <KpiColumn key={c.label} card={c} />
        ))}
      </div>
    </div>
  );
}
