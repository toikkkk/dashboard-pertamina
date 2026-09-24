"use client";

import React from "react";
import Link from "next/link";
import Panel, { EmptyLine } from "@/components/dashboard/Panel";
import { EXPIRING_WITHIN_DAYS, type psiInsights } from "@/lib/domain/dashboard";

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

// Dokumen yang BELUM kedaluwarsa tetapi berakhir dalam 90 hari. Yang sudah lewat ada di
// halaman Overdue. Sisa hari berwarna: merah <= 30 hari, oranye sesudahnya.
export default function UpcomingExpiryList({ items }: { items: ReturnType<typeof psiInsights>["expiring"] }) {
  const shown = items.slice(0, 5);
  return (
    <Panel id="segera-kedaluwarsa" title="Segera Kedaluwarsa" right={items.length > 0 ? `${items.length} dokumen` : undefined}>
      {shown.length > 0 ? (
        <ul className="flex flex-col divide-y divide-[#eef0f2]">
          {shown.map(({ doc, daysLeft }) => (
            <li key={doc.id}>
              <Link href={`/document/${doc.id}`} className="flex items-center gap-3 py-2.5 -mx-2 px-2 rounded-[8px] transition-colors duration-200 hover:bg-[#f6f8f9] group">
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold text-[#0F172A] group-hover:text-[#0F3B59] truncate transition-colors">{doc.title}</div>
                  <div className="text-[11px] text-[#3a3d40] mt-0.5 truncate">
                    {doc.location} · berakhir <span className="font-mono tabular-nums">{fmtDate(doc.expiryDate)}</span>
                  </div>
                </div>
                <span className="font-mono text-[12px] font-semibold tabular-nums flex-shrink-0" style={{ color: daysLeft <= 30 ? "#DC2626" : "#B45309" }}>
                  {daysLeft} hari
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyLine>Tidak ada dokumen yang berakhir dalam {EXPIRING_WITHIN_DAYS} hari.</EmptyLine>
      )}
    </Panel>
  );
}
