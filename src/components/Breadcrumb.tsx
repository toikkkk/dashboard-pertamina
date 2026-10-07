"use client";

// Jalur navigasi bergaya folder (Direktori › Lokasi › Sub-dokumen) — tiap level di
// atasnya bisa diklik untuk naik satu/beberapa tingkat, seperti membuka sub-folder di
// Google Drive lalu klik folder induknya (permintaan client, 2026-10-07).
import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  /** Tautan biasa (halaman lain). */
  href?: string;
  /** Aksi di halaman yang sama (ganti parameter URL). */
  onClick?: () => void;
}

export default function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Jalur navigasi" className="flex items-center flex-wrap gap-x-1 gap-y-0.5 text-[12.5px] mb-4">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        const cls = "font-semibold text-[#0F3B59] hover:text-[#0B2C43] hover:underline underline-offset-2 transition-colors duration-150";
        return (
          <React.Fragment key={`${i}-${c.label}`}>
            {i > 0 && <ChevronRight className="w-3 h-3 text-[#c3c6c9] flex-shrink-0" strokeWidth={2.2} aria-hidden />}
            {last || (!c.href && !c.onClick) ? (
              <span aria-current={last ? "page" : undefined} className={last ? "font-bold text-[#0F172A]" : "text-[#6b6e72]"}>{c.label}</span>
            ) : c.href ? (
              <Link href={c.href} className={cls}>{c.label}</Link>
            ) : (
              <button type="button" onClick={c.onClick} className={cls}>{c.label}</button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
