import React from "react";

export type Severity = "baik" | "peringatan" | "kritis" | "revisi";

export const severityStyles: Record<Severity, { text: string; soft: string; line: string }> = {
  baik: { text: "text-[#15803D]", soft: "bg-[#E6F4E9]", line: "bg-[#15803D]" },
  peringatan: { text: "text-[#B45309]", soft: "bg-[#FFF3D9]", line: "bg-[#B45309]" },
  kritis: { text: "text-[#DC2626]", soft: "bg-[#FDE8E8]", line: "bg-[#DC2626]" },
  revisi: { text: "text-[#6D28D9]", soft: "bg-[#F0EAFE]", line: "bg-[#6D28D9]" },
};

export function StatusDot({ severity, className = "" }: { severity: Severity; className?: string }) {
  return <span aria-hidden="true" className={`inline-block h-2 w-2 shrink-0 rounded-full ${severityStyles[severity].line} ${className}`} />;
}

export function StatusPill({ severity, children }: { severity: Severity; children: React.ReactNode }) {
  return <span className={`status-pill ${severityStyles[severity].soft} ${severityStyles[severity].text}`}>{children}</span>;
}
