"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Segmented from "@/components/dashboard/Segmented";

gsap.registerPlugin(useGSAP);

export type DashboardView = "psi" | "moc";

export interface SummaryPart {
  text: string;
  tone?: "bad" | "warn" | "good" | "plain";
}

const TONE: Record<NonNullable<SummaryPart["tone"]>, string> = {
  bad: "text-[#DC2626]",
  warn: "text-[#B45309]",
  good: "text-[#15803D]",
  plain: "text-[#0F172A]",
};

// Rangkaian bagian ringkasan menjadi satu kalimat: "A, B, dan C."
function Sentence({ parts, fallback }: { parts: SummaryPart[]; fallback: SummaryPart }) {
  const list = parts.length > 0 ? parts : [fallback];
  return (
    <>
      {list.map((p, i) => (
        <React.Fragment key={p.text}>
          {i > 0 && (i === list.length - 1 ? " dan " : ", ")}
          <span className={`font-bold ${TONE[p.tone ?? "plain"]}`}>{p.text}</span>
        </React.Fragment>
      ))}
      .
    </>
  );
}

function greeting(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat("id-ID", { hour: "numeric", hour12: false, timeZone: "Asia/Jakarta" }).format(now));
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

export default function DashboardHeader({
  name,
  scopeLabel,
  view,
  onView,
  hideViewSwitch = false,
  canPickScope,
  viewAll,
  onViewAll,
  parts,
  fallback,
  loading,
}: {
  name: string;
  scopeLabel: string;
  view: DashboardView;
  onView: (v: DashboardView) => void;
  hideViewSwitch?: boolean;
  canPickScope: boolean;
  viewAll: boolean;
  onViewAll: (v: boolean) => void;
  parts: SummaryPart[];
  fallback: SummaryPart;
  loading: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const now = new Date();
  const dateText = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(now);
  const first = name.trim().split(/\s+/)[0] || "";

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(".dh-line", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out", stagger: 0.08 });
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <div ref={root} className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 mb-5">
      <div className="min-w-0">
        <div className="dh-line text-[12.5px] font-semibold text-[#3a3d40]">
          {dateText} <span className="text-[#6b6e72]">· {scopeLabel}</span>
        </div>
        <h1 className="dh-line font-heading text-[28px] sm:text-[34px] leading-[1.1] font-bold text-[#0F172A] mt-1.5">
          {greeting(now)}, {first}.
        </h1>
        <p key={view} className="dh-line text-[14.5px] text-[#3a3d40] mt-2 max-w-[62ch] animate-fadeIn" aria-live="polite">
          {loading ? "Memuat data…" : <Sentence parts={parts} fallback={fallback} />}
        </p>
      </div>

      <div className="dh-line flex flex-col items-start sm:items-end gap-2">
        {!hideViewSwitch && (
          <Segmented
            label="Pilih dashboard"
            value={view}
            onChange={onView}
            options={[
              { value: "psi", label: "Dashboard PSI" },
              { value: "moc", label: "Dashboard MOC" },
            ]}
          />
        )}
        {canPickScope && (
          <Segmented
            label="Cakupan lokasi"
            value={viewAll ? "all" : "own"}
            onChange={(v) => onViewAll(v === "all")}
            options={[
              { value: "own", label: "Lokasi saya" },
              { value: "all", label: "Semua lokasi, lihat saja" },
            ]}
          />
        )}
      </div>
    </div>
  );
}
