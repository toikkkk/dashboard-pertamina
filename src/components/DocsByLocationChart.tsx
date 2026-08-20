"use client";

import React, { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { usePsi } from "@/lib/psiStore";

gsap.registerPlugin(useGSAP);

const BREAKDOWN_META = [
  { key: "Approved" as const, label: "Approved", color: "#15803D" },
  { key: "In Routing" as const, label: "In Routing", color: "#B45309" },
  { key: "Expired" as const, label: "Expired", color: "#DC2626" },
];

export default function DocsByLocationChart() {
  const { locations, allDocuments } = usePsi();
  const [hoverName, setHoverName] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const data = locations.map((loc) => {
    const docsHere = allDocuments.filter((d) => d.location === loc.locationName);
    const approved = docsHere.filter((d) => d.status === "Approved").length;
    const inRouting = docsHere.filter((d) => d.status === "In Routing").length;
    const expired = docsHere.filter((d) => d.status === "Expired").length;
    const other = docsHere.length - approved - inRouting - expired;
    return { name: loc.locationName, count: docsHere.length, approved, inRouting, expired, other };
  });

  const maxCount = Math.max(1, ...data.map((d) => d.count));
  const hovered = data.find((d) => d.name === hoverName) ?? null;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // fromTo, not from() — see KpiSummaryCards for why (StrictMode double-invoke).
        gsap.fromTo(
          ".location-bar",
          { scaleY: 0, transformOrigin: "bottom center" },
          { scaleY: 1, transformOrigin: "bottom center", duration: 0.55, ease: "power3.out", stagger: 0.07 }
        );
      });
      return () => mm.revert();
    },
    { scope: chartRef, dependencies: [data.length] }
  );

  return (
    <div className="bg-white border border-[#D6DEE8] rounded-[2px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_6px_rgba(15,23,42,.04)] p-4 h-full relative transition-all duration-300 ease-out-expo hover:shadow-[0_4px_16px_rgba(0,0,0,.07)] hover:-translate-y-[1px]">
      <h3 className="text-[13px] font-bold text-[#0F172A] mb-4">Dokumen per Terminal</h3>

      <div ref={chartRef} className="flex items-end justify-between gap-1 h-[130px]">
        {data.map((d) => (
          <div
            key={d.name}
            className="relative flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
            onMouseEnter={() => setHoverName(d.name)}
            onMouseLeave={() => setHoverName(null)}
          >
            <span className="text-[11px] font-bold text-[#3a3d40] tabular-nums">{d.count}</span>
            {/* Bar capped at 24px thick per mark-spec — never let it fill the whole slot. */}
            <div
              className="location-bar w-full max-w-[24px] rounded-t-[3px] rounded-b-none cursor-pointer transition-colors duration-200 ease-out-expo"
              style={{
                height: `${(d.count / maxCount) * 90}px`,
                background: hoverName === d.name ? "#075985" : "#0369A1",
                minHeight: d.count > 0 ? 4 : 0,
              }}
            />
            <span className="text-[10px] text-[#6b6e72] font-medium text-center leading-tight">{d.name.replace(/^(FT|IT|AFT)\s+/, "")}</span>

            {hoverName === d.name && hovered && (
              <div
                className="absolute bottom-full mb-2 z-20 bg-white border border-[#D6DEE8] rounded-[2px] shadow-[0_8px_20px_rgba(0,0,0,.15)] px-3 py-2.5 w-[160px] animate-popIn pointer-events-none"
                style={{ left: "50%", transform: "translateX(-50%)" }}
              >
                <div className="text-[11.5px] font-bold text-[#0F172A] mb-1.5">{d.name}</div>
                {BREAKDOWN_META.map((m) => (
                  <div key={m.key} className="flex items-center justify-between gap-3 text-[11px] mb-0.5">
                    <span className="flex items-center gap-1.5 text-[#6b6e72]">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                      {m.label}
                    </span>
                    <span className="font-bold text-[#0F172A]">{hovered[m.key === "Approved" ? "approved" : m.key === "In Routing" ? "inRouting" : "expired"]}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5 text-[#6b6e72]">
                    <span className="w-2 h-2 rounded-full flex-shrink-0 bg-[#9a9da0]" />
                    Lainnya
                  </span>
                  <span className="font-bold text-[#0F172A]">{hovered.other}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
