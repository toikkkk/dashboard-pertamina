"use client";

import React, { useEffect, useRef, useState } from "react";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

// Pemilih dua/tiga pilihan dengan penanda yang meluncur (transform saja, tanpa
// mengubah tata letak). Berperan sebagai tablist: panah kiri/kanan berpindah, Tab
// masuk ke pilihan aktif.
export default function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const btns = useRef<Record<string, HTMLButtonElement | null>>({});
  const [box, setBox] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const measure = () => {
      const el = btns.current[value];
      if (el) setBox({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [value, options]);

  const move = (dir: 1 | -1) => {
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + dir + options.length) % options.length];
    onChange(next.value);
    btns.current[next.value]?.focus();
  };

  return (
    <div
      ref={wrap}
      role="tablist"
      aria-label={label}
      className="relative inline-flex p-[3px] rounded-[10px] bg-white border border-[#C5CED3] max-w-full"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); move(1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); }
      }}
    >
      {box && (
        <span
          aria-hidden
          className="absolute top-[3px] bottom-[3px] left-0 rounded-[7px] bg-[#0F3B59] transition-[transform,width] duration-300 ease-[cubic-bezier(.22,1,.36,1)]"
          style={{ width: box.width, transform: `translateX(${box.left}px)` }}
        />
      )}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => { btns.current[o.value] = el; }}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={`relative z-10 px-3.5 py-1.5 min-h-[34px] text-[12.5px] font-bold rounded-[7px] transition-colors duration-200 whitespace-nowrap ${
              active ? `text-white ${box ? "" : "bg-[#0F3B59]"}` : "text-[#3a3d40] hover:text-[#0F3B59]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
