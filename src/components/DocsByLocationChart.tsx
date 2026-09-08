"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { usePsi } from "@/lib/psiStore";
import { isDocOverdue, DocumentStatus } from "@/lib/mockData";
import { DOCUMENT_STATUS_META } from "@/lib/domain/statusStyle";

gsap.registerPlugin(useGSAP);

// Same 5-status set and colors as StatusOverview's segmented bar — this ledger's
// per-row mini bar is that same chart at a smaller scale, so the two widgets read
// as one visual language instead of two unrelated ones. Draft omitted (never
// appears in seed/real data at this granularity, and the row would be all-empty).
const BREAKDOWN_ORDER: DocumentStatus[] = ["Approved", "In Routing", "Revision Required", "Expired"];

export default function DocsByLocationChart() {
  const { locations, allDocuments } = usePsi();
  const listRef = useRef<HTMLDivElement>(null);

  // effectiveStatus mirrors StatusOverview: a doc stored "Approved" whose expiryDate
  // has already passed counts as Expired here too, so the two widgets never disagree.
  const effectiveStatus = (d: (typeof allDocuments)[number]): DocumentStatus =>
    isDocOverdue(d) ? "Expired" : d.status;

  const data = locations
    .map((loc) => {
      const docsHere = allDocuments.filter((d) => d.location === loc.locationName);
      const total = docsHere.length;
      const segments = BREAKDOWN_ORDER.map((status) => ({
        status,
        count: docsHere.filter((d) => effectiveStatus(d) === status).length,
      })).filter((s) => s.count > 0);
      return { name: loc.locationName, total, segments };
    })
    .sort((a, b) => b.total - a.total);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".terminal-row",
          { opacity: 0, x: -6 },
          { opacity: 1, x: 0, duration: 0.4, ease: "power2.out", stagger: 0.05 }
        );
        gsap.fromTo(
          ".terminal-seg",
          { scaleX: 0, transformOrigin: "left center" },
          { scaleX: 1, transformOrigin: "left center", duration: 0.55, ease: "power3.out", stagger: 0.05, delay: 0.1 }
        );
      });
      return () => mm.revert();
    },
    { scope: listRef, dependencies: [data.length] }
  );

  return (
    <div className="bg-[#DBD4CC] border border-[#C5CED3] rounded-[8px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_6px_rgba(15,23,42,.04)] p-4 h-full transition-all duration-300 ease-out-expo hover:shadow-[0_4px_16px_rgba(0,0,0,.07)] hover:-translate-y-[1px]">
      <h3 className="text-[13px] font-bold text-[#0F172A] mb-3.5">Dokumen per Terminal</h3>

      <div ref={listRef} className="flex flex-col divide-y divide-[#f0f0f1]">
        {data.map((d) => (
          <div key={d.name} className="terminal-row flex items-center gap-3 py-2.5">
            <span className="w-[3px] h-[3px] rounded-full bg-[#0F3B59] flex-shrink-0" aria-hidden />
            <span className="text-[12px] font-semibold text-[#3a3d40] w-[86px] flex-shrink-0 truncate">{d.name}</span>
            <div className="flex-1 h-[8px] rounded-full overflow-hidden flex gap-px bg-[#eceded] min-w-0">
              {d.segments.map((seg) => (
                <div
                  key={seg.status}
                  className="terminal-seg h-full"
                  style={{
                    width: `${(seg.count / Math.max(1, d.total)) * 100}%`,
                    background: DOCUMENT_STATUS_META[seg.status].color,
                  }}
                  title={`${DOCUMENT_STATUS_META[seg.status].label}: ${seg.count}`}
                />
              ))}
            </div>
            <span className="font-mono text-[12px] font-semibold text-[#0F172A] tabular-nums w-[20px] text-right flex-shrink-0">{d.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
