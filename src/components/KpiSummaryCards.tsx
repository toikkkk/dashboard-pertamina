"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Link from "next/link";
import { useCountUp } from "@/lib/useCountUp";
import type { psiInsights } from "@/lib/domain/dashboard";

gsap.registerPlugin(useGSAP);

interface KpiCardDef {
  label: string;
  count: number;
  rate: number;
  path: string; // rute (/directory) atau jangkar di halaman ini (#segera-kedaluwarsa)
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
  const animatedCount = useCountUp(card.count, 700);
  const cls =
    "kpi-card group flex-1 lg:min-w-[160px] bg-white p-4 lg:p-5 transition-colors duration-200 hover:bg-[#f6f8f9] focus-visible:bg-[#f6f8f9] block";
  const body = (
    <>
      <div className="text-[10.5px] font-bold tracking-[.06em] uppercase text-[#3a3d40] mb-2.5">{card.label}</div>
      {/* Archivo (heading), not mono, on the hero value: a single standalone figure has
          no neighbouring digits to align against. */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="font-heading text-[30px] font-bold leading-none" style={{ color: card.color }}>{animatedCount}</span>
        <span className="text-[12px] font-semibold text-[#6b6e72]">{card.rate}%</span>
      </div>
      <div className="h-[3px] bg-[#eceded] rounded-full overflow-hidden">
        <div className="h-full origin-left transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)]" style={{ background: card.color, width: "100%", transform: `scaleX(${card.rate / 100})` }} />
      </div>
    </>
  );
  // Rute sungguhan memakai Link, jangkar halaman memakai <a>: keduanya dapat difokus
  // dengan keyboard (sebelumnya div dengan onClick).
  return card.path.startsWith("#") ? (
    <a href={card.path} className={cls}>{body}</a>
  ) : (
    <Link href={card.path} className={cls}>{body}</Link>
  );
}

export default function KpiSummaryCards({ insights }: { insights: ReturnType<typeof psiInsights> }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const totalDocs = insights.total;
  const pct = (n: number) => (totalDocs > 0 ? Math.round((n / totalDocs) * 100) : 0);

  const cards: KpiCardDef[] = [
    { label: "Approved", count: insights.approved, rate: pct(insights.approved), path: "/directory?status=Approved", color: "#15803D" },
    { label: "Kedaluwarsa", count: insights.overdue.length, rate: pct(insights.overdue.length), path: "/dilemma", color: "#DC2626" },
    { label: "Berakhir dalam 90 hari", count: insights.expiring.length, rate: pct(insights.expiring.length), path: "#segera-kedaluwarsa", color: "#B45309" },
    { label: "Belum diperbarui 12 bulan", count: insights.stale.length, rate: pct(insights.stale.length), path: "#perlu-evaluasi", color: "#0F3B59" },
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
    <div className="bg-white border border-[#C5CED3] rounded-[8px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_6px_rgba(15,23,42,.04)] mb-3.5">
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
        className="grid grid-cols-2 lg:flex gap-px bg-[#eceded] border-t border-[#C5CED3] overflow-hidden rounded-b-[8px]"
      >
        {cards.map((c) => (
          <KpiColumn key={c.label} card={c} />
        ))}
      </div>
    </div>
  );
}
