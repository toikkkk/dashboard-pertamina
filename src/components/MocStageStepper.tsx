import React from "react";
import type { MocRequest } from "@/lib/domain/moc";

// Tahap bernama untuk MOC. Tahap A-C (Inisiasi & Risiko -> Review -> Persetujuan ->
// Registrasi) diturunkan dari validationState; tahap sesudahnya mengikuti status
// Register (Lampiran 8). Bahasa visual sama dengan StatusTag: penanda dash kecil
// berwarna + label — bukan ikon di dalam kotak berwarna.
const VALIDATION_STEPS = ["Inisiasi & Risiko", "Review", "Persetujuan", "Registrasi"] as const;
const LATER_STEPS = ["Implementasi", "Pemantauan", "Tinjauan Akhir", "Closed"] as const;

const DONE = "#15803D";
const ACTIVE = "#0F3B59";
const WARN = "#B45309";
const BAD = "#DC2626";
const IDLE = "#C5CED3";

function currentIndex(moc: Pick<MocRequest, "validationState" | "registerStatus">): number {
  switch (moc.validationState) {
    case "draft":
    case "returned":
    case "rejected":
      return 0;
    case "in_review":
      return 1;
    case "pending_approval":
      return 2;
    case "approved":
      return 3;
    case "registered": {
      const later = LATER_STEPS.indexOf(moc.registerStatus as (typeof LATER_STEPS)[number]);
      return VALIDATION_STEPS.length + Math.max(0, later);
    }
  }
}

export default function MocStageStepper({ moc }: { moc: Pick<MocRequest, "validationState" | "registerStatus"> }) {
  const steps = [...VALIDATION_STEPS, ...LATER_STEPS];
  const cur = currentIndex(moc);
  const closed = moc.registerStatus === "Closed" && moc.validationState === "registered";
  const problem = moc.validationState === "returned" ? WARN : moc.validationState === "rejected" ? BAD : null;

  return (
    <ol className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Tahap MOC">
      {steps.map((label, i) => {
        const done = i < cur || (closed && i === cur);
        const active = i === cur && !closed;
        const color = done ? DONE : active ? (problem ?? ACTIVE) : IDLE;
        return (
          <li key={label} className="flex items-center gap-1.5" aria-current={active ? "step" : undefined}>
            <span className="inline-block w-4 h-[3px] rounded-full flex-shrink-0" style={{ background: color }} />
            <span
              className="text-[11.5px] whitespace-nowrap"
              style={{ color: done || active ? "#0F172A" : "#9a9da0", fontWeight: active ? 700 : 600 }}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
