"use client";

import React from "react";

const positions = [
  "top-[-6px] left-[-6px]",
  "top-[-6px] right-[-6px]",
  "bottom-[-6px] left-[-6px]",
  "bottom-[-6px] right-[-6px]",
];

export default function CornerTicks({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const stroke = variant === "light" ? "#FFFFFF" : "#0F172A";
  return (
    <>
      {positions.map((pos) => (
        <svg key={pos} width="11" height="11" viewBox="0 0 11 11" className={`absolute ${pos} ${variant === "light" ? "opacity-30" : "opacity-40"} pointer-events-none`}>
          <line x1="5.5" y1="0" x2="5.5" y2="11" stroke={stroke} strokeWidth="1" />
          <line x1="0" y1="5.5" x2="11" y2="5.5" stroke={stroke} strokeWidth="1" />
        </svg>
      ))}
    </>
  );
}
