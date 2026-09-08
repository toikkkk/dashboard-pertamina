"use client";

import React from "react";
import Link from "next/link";
import { usePsi } from "@/lib/psiStore";
import { CalendarClock } from "lucide-react";
import { isDocOverdue } from "@/lib/mockData";

function fmtDate(iso: string) {
  if (!iso) return "-";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default function UpcomingExpiryList() {
  const { documents } = usePsi();

  // Already-overdue docs belong exclusively in the Overdue tab, not here — this list
  // is specifically for expiries that haven't happened yet.
  const upcoming = [...documents]
    .filter((d) => !isDocOverdue(d))
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
    .slice(0, 4);

  return (
    <div className="bg-[#DBD4CC] border border-[#C5CED3] rounded-[8px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_6px_rgba(15,23,42,.04)] p-4 h-full transition-all duration-300 ease-out-expo hover:shadow-[0_4px_16px_rgba(0,0,0,.07)] hover:-translate-y-[1px]">
      <h3 className="text-[13px] font-bold text-[#0F172A] mb-3.5">Segera Kedaluwarsa</h3>

      {upcoming.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {upcoming.map((d, i) => (
            <Link
              key={d.id}
              href={`/document/${d.id}`}
              className="flex items-start gap-2.5 group rounded-[8px] -mx-1.5 px-1.5 py-0.5 transition-colors duration-200 hover:bg-[#f7f7f8] animate-fadeInUp"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="w-6 h-6 rounded-[8px] bg-[#FEF3C7] flex items-center justify-center flex-shrink-0 mt-0.5 transition-transform duration-200 ease-out-expo group-hover:scale-110">
                <CalendarClock className="w-3.5 h-3.5 text-[#B45309]" strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-[#0F172A] group-hover:text-[#0F3B59] truncate transition-colors">{d.title}</div>
                <div className="flex items-center gap-1 mt-0.5 text-[10.5px]">
                  <span className="font-mono text-[#9a9da0] tabular-nums">{fmtDate(d.expiryDate)}</span>
                  <span className="text-[#c3c6c9]">·</span>
                  <span className="font-semibold text-[#6b6e72]">{d.location}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-[12px] text-[#9a9da0] py-4 text-center">Tidak ada dokumen yang mendekati kedaluwarsa.</p>
      )}
    </div>
  );
}
