import React from "react";

// Shared "dash + neutral-ink label" tag — replaces the tinted-pill badge pattern
// (rounded-[8px] background: meta.tint, color: meta.color) that used to be copied
// independently into ~9 files. Color lives only in the small mark; the label text
// stays a plain ink token (see statusStyle.ts's header comment for why).
export default function StatusTag({
  color,
  label,
  size = "md",
}: {
  color: string;
  label: string;
  size?: "sm" | "md";
}) {
  const text = size === "sm" ? "text-[10px]" : "text-[11px]";
  return (
    <span className={`inline-flex items-center gap-1.5 ${text} font-bold text-[#3a3d40] whitespace-nowrap`}>
      <span className="inline-block w-2 h-[3px] rounded-full flex-shrink-0" style={{ background: color }} />
      {label}
    </span>
  );
}
