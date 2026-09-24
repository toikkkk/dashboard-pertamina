import React from "react";
import { MOC_STAGES, mocStageIndex, type MocRequest } from "@/lib/domain/moc";

// Batang progres tahap MOC: 8 segmen tipis + satu kalimat "Tahap X dari 8 · Nama".
// (Sebelumnya 8 label berderet yang sulit dibaca sekilas.) Tahap A-C diturunkan dari
// validationState; tahap sesudahnya mengikuti status Register (Lampiran 8).
const STEPS = MOC_STAGES;

const DONE = "#15803D";
const ACTIVE = "#0F3B59";
const WARN = "#B45309";
const BAD = "#DC2626";
const IDLE = "#DCE2E6";

export default function MocStageStepper({ moc }: { moc: Pick<MocRequest, "validationState" | "registerStatus"> }) {
  const cur = mocStageIndex(moc);
  const closed = moc.registerStatus === "Closed" && moc.validationState === "registered";
  const problem = moc.validationState === "returned" ? WARN : moc.validationState === "rejected" ? BAD : null;
  const label = closed ? "Selesai" : `Tahap ${cur + 1} dari ${STEPS.length} · ${STEPS[cur]}`;

  return (
    <div aria-label={`Progres MOC: ${label}`}>
      <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={closed ? STEPS.length : cur + 1}>
        {STEPS.map((s, i) => {
          const done = i < cur || (closed && i === cur);
          const active = i === cur && !closed;
          return <span key={s} className="h-[5px] flex-1 rounded-full" style={{ background: done ? DONE : active ? (problem ?? ACTIVE) : IDLE }} title={s} />;
        })}
      </div>
      <div className="flex items-center justify-between gap-3 mt-1.5">
        <span className="text-[12px] font-bold text-[#0F172A]">{label}</span>
        {!closed && cur < STEPS.length - 1 && <span className="text-[11.5px] text-[#6b6e72]">Berikutnya: {STEPS[cur + 1]}</span>}
      </div>
    </div>
  );
}
