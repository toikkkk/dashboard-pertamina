"use client";

import React from "react";
import { CalendarDays, ClipboardCheck, FileCheck2 } from "lucide-react";
import type { DashboardView, SummaryPart } from "@/components/dashboard/types";

const TONE: Record<NonNullable<SummaryPart["tone"]>, string> = {
  bad: "text-[#DC2626]",
  warn: "text-[#B45309]",
  good: "text-[#15803D]",
  plain: "text-[#0F172A]",
};

function Sentence({ parts, fallback }: { parts: SummaryPart[]; fallback: SummaryPart }) {
  const list = parts.length > 0 ? parts : [fallback];
  return (
    <>
      {list.map((p, i) => (
        <React.Fragment key={p.text}>
          {i > 0 && (i === list.length - 1 ? " dan " : ", ")}
          <span className={`font-semibold ${TONE[p.tone ?? "plain"]}`}>{p.text}</span>
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

// Kepala dashboard: sapaan + ringkasan satu kalimat dari data + pemilih Dashboard
// PSI/MOC. Porting `.greeting-*` dari desain Manus; toggle-nya persis strukturnya
// (role="tablist", ikon + kode PSI/MOC — lihat design.md "Greeting area dan PSI/MOC
// toggle") agar tetap tampil minimal sesuai instruksi (tanpa sublabel panjang).
export default function Greeting({
  name,
  view,
  onView,
  parts,
  fallback,
}: {
  name: string;
  view: DashboardView;
  onView: (v: DashboardView) => void;
  parts: SummaryPart[];
  fallback: SummaryPart;
}) {
  const now = new Date();
  const dateText = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(now);
  const first = name.trim().split(/\s+/)[0] || "";

  return (
    <div className="greeting-wrap">
      <div className="greeting-copy">
        <h1>
          {greeting(now)}, <em>{first}.</em>
        </h1>
        <p className="greeting-summary">
          <Sentence parts={parts} fallback={fallback} />
        </p>
        <div className="greeting-meta">
          <span><CalendarDays className="h-3.5 w-3.5" /> {dateText}</span>
        </div>
      </div>
      <div className="greeting-side">
        <div className="view-switcher greeting-switcher" role="tablist" aria-label="Pilih dashboard">
          <button role="tab" aria-selected={view === "psi"} aria-controls="dashboard-panel" className={view === "psi" ? "view-tab-active" : ""} onClick={() => onView("psi")}>
            <FileCheck2 aria-hidden="true" className="h-4 w-4" />
            <span className="toggle-code">PSI</span>
          </button>
          <button role="tab" aria-selected={view === "moc"} aria-controls="dashboard-panel" className={view === "moc" ? "view-tab-active" : ""} onClick={() => onView("moc")}>
            <ClipboardCheck aria-hidden="true" className="h-4 w-4" />
            <span className="toggle-code">MOC</span>
          </button>
        </div>
      </div>
    </div>
  );
}
