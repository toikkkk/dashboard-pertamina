"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Segmented from "@/components/dashboard/Segmented";

gsap.registerPlugin(useGSAP);

export type DashboardView = "psi" | "moc";

// Satu baris: judul di kiri, dua kontrol di kanan (pilihan dashboard, lalu cakupan
// lokasi). Di layar sempit kontrol turun ke bawah judul dan tetap sejajar.
export default function DashboardHeader({
  scopeLabel,
  view,
  onView,
  hideViewSwitch = false,
  canPickScope,
  viewAll,
  onViewAll,
}: {
  scopeLabel: string;
  view: DashboardView;
  onView: (v: DashboardView) => void;
  hideViewSwitch?: boolean;
  canPickScope: boolean;
  viewAll: boolean;
  onViewAll: (v: boolean) => void;
}) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(".dh-item", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", stagger: 0.07 });
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <div ref={root} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 mb-5">
      <h1 className="dh-item font-heading text-[26px] sm:text-[30px] leading-tight font-bold text-[#0F172A]">
        Dashboard {scopeLabel}
      </h1>

      <div className="dh-item flex flex-wrap items-center gap-2.5">
        {!hideViewSwitch && (
          <Segmented
            label="Pilih dashboard"
            value={view}
            onChange={onView}
            options={[
              { value: "psi", label: "PSI" },
              { value: "moc", label: "MOC" },
            ]}
          />
        )}
        {canPickScope && (
          <select
            aria-label="Cakupan lokasi"
            value={viewAll ? "all" : "own"}
            onChange={(e) => onViewAll(e.target.value === "all")}
            className="min-h-[40px] pl-3 pr-8 rounded-[10px] border border-[#C5CED3] bg-white text-[12.5px] font-bold text-[#0F172A] cursor-pointer hover:border-[#0F3B59]"
          >
            <option value="own">Lokasi saya</option>
            <option value="all">Semua lokasi (lihat saja)</option>
          </select>
        )}
      </div>
    </div>
  );
}
