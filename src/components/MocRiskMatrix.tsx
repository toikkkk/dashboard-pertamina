"use client";

// Matriks risiko 5x5 seperti gambar client: baris = Dampak (Severity) 5..1, kolom = Kemungkinan (Likelihood) 1..5.
// Tiap sel menampilkan nilai risiko (severity x likelihood) dengan warna tingkatnya; klik sel mengisi keparahan dan
// probabilitas sekaligus (klik sel yang sama lagi = kosongkan).
import React from "react";
import {
  MOC_LIKELIHOOD_LEVELS,
  MOC_RISK_LEVEL_COLOR,
  MOC_SEVERITY_LEVELS,
  riskLevel,
} from "@/lib/domain/moc";

export default function MocRiskMatrix({
  severity,
  probability,
  onPick,
  disabled,
}: {
  severity: number | null;
  probability: number | null;
  onPick: (severity: number | null, probability: number | null) => void;
  disabled?: boolean;
}) {
  const severities = [...MOC_SEVERITY_LEVELS].reverse();
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[420px] max-w-[640px]">
        <div className="text-center text-[11px] font-bold tracking-[.04em] uppercase text-[#3a3d40] mb-1.5">Risiko = Likelihood × Severity</div>
        <div className="flex gap-2">
          <div className="flex items-center justify-center w-5 flex-shrink-0">
            <span className="text-[10.5px] font-bold tracking-[.06em] uppercase text-[#6b6e72]" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", whiteSpace: "nowrap" }}>
              Dampak (Severity)
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="grid" style={{ gridTemplateColumns: "88px repeat(5, minmax(0, 1fr))", gap: 2 }}>
              {severities.map((sv) => (
                <React.Fragment key={sv.value}>
                  <div className="flex flex-col items-end justify-center pr-2 text-right leading-tight">
                    <span className="text-[12px] font-bold text-[#0F172A]">{sv.value}</span>
                    <span className="text-[10.5px] text-[#6b6e72]">{sv.label}</span>
                  </div>
                  {MOC_LIKELIHOOD_LEVELS.map((lk) => {
                    const value = sv.value * lk.value;
                    const level = riskLevel(value)!;
                    const on = severity === sv.value && probability === lk.value;
                    return (
                      <button
                        key={lk.value}
                        type="button"
                        disabled={disabled}
                        aria-pressed={on}
                        aria-label={`Severity ${sv.value} ${sv.label}, Likelihood ${lk.value} ${lk.label}, nilai risiko ${value}`}
                        onClick={() => (on ? onPick(null, null) : onPick(sv.value, lk.value))}
                        className="h-[38px] text-[13px] font-mono font-bold text-[#0F172A] transition-transform duration-100 disabled:opacity-60 hover:brightness-95"
                        style={{
                          background: MOC_RISK_LEVEL_COLOR[level],
                          outline: on ? "3px solid #0F172A" : undefined,
                          outlineOffset: on ? -3 : undefined,
                          boxShadow: on ? "inset 0 0 0 5px rgba(255,255,255,.55)" : undefined,
                        }}
                      >
                        {value}
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
            <div className="grid mt-1" style={{ gridTemplateColumns: "88px repeat(5, minmax(0, 1fr))", gap: 2 }}>
              <div className="flex items-start justify-end pr-2 pt-1 text-[10.5px] font-bold uppercase tracking-[.04em] text-[#6b6e72]">Level</div>
              {MOC_LIKELIHOOD_LEVELS.map((lk) => (
                <div key={lk.value} className="text-center leading-tight px-0.5">
                  <div className="text-[11px] font-bold text-[#0F172A]">{lk.value} ({lk.label})</div>
                  <div className="text-[10px] text-[#6b6e72]">{lk.range}</div>
                  <div className="text-[10px] text-[#9a9da0]">{lk.frequency}</div>
                </div>
              ))}
            </div>
            <div className="text-center text-[10.5px] font-bold uppercase tracking-[.06em] text-[#6b6e72] mt-1.5">Kemungkinan (Probabilitas / Likelihood)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
