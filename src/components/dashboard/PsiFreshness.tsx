"use client";

import React from "react";
import Link from "next/link";
import Panel, { EmptyLine } from "@/components/dashboard/Panel";
import StatusTag from "@/components/StatusTag";
import { LAST_UPDATE_META } from "@/lib/domain/statusStyle";
import type { psiInsights } from "@/lib/domain/dashboard";

type Insights = ReturnType<typeof psiInsights>;

const fmt = (ms: number) => new Date(ms).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

// TKO PSI meminta evaluasi tahunan oleh Penanggung Jawab. Sistem belum punya catatan
// "evaluasi", jadi yang ditampilkan adalah dokumen yang isinya belum diperbarui
// (dibuat, direvisi, atau diperpanjang) lebih dari 12 bulan.
export function PsiStaleList({ items }: { items: Insights["stale"] }) {
  const shown = items.slice(0, 5);
  return (
    <Panel id="perlu-evaluasi" title="Belum Diperbarui Lebih dari 12 Bulan" right={items.length > 0 ? `${items.length} dokumen` : undefined}>
      {shown.length > 0 ? (
        <ul className="flex flex-col divide-y divide-[#eef0f2]">
          {shown.map(({ doc, lastUpdate, months }) => (
            <li key={doc.id}>
              <Link href={`/document/${doc.id}`} className="flex items-center gap-3 py-2.5 -mx-2 px-2 rounded-[8px] transition-colors duration-200 hover:bg-[#f6f8f9] group">
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold text-[#0F172A] group-hover:text-[#0F3B59] truncate transition-colors">{doc.title}</div>
                  <div className="text-[11px] text-[#3a3d40] mt-0.5 truncate">
                    {doc.location} · terakhir diperbarui <span className="font-mono tabular-nums">{fmt(lastUpdate)}</span>
                  </div>
                </div>
                <span className="font-mono text-[12px] font-semibold tabular-nums text-[#0F3B59] flex-shrink-0">{months} bln</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyLine>Semua dokumen diperbarui dalam 12 bulan terakhir.</EmptyLine>
      )}
    </Panel>
  );
}

// Yang baru masuk atau berubah, terbaru di atas (regional perlu melihat "yang update
// yang mana", sesuai rapat).
export function PsiRecentUpdates({ items }: { items: Insights["recent"] }) {
  return (
    <Panel title="Pembaruan Terbaru">
      {items.length > 0 ? (
        <ul className="flex flex-col divide-y divide-[#eef0f2]">
          {items.map(({ doc, entry, type, at }) => (
            <li key={entry.id}>
              <Link href={`/document/${doc.id}`} className="flex items-center gap-3 py-2.5 -mx-2 px-2 rounded-[8px] transition-colors duration-200 hover:bg-[#f6f8f9] group">
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold text-[#0F172A] group-hover:text-[#0F3B59] truncate transition-colors">{doc.title}</div>
                  <div className="text-[11px] text-[#3a3d40] mt-0.5 truncate">
                    {doc.location} · {entry.actorName} · <span className="font-mono tabular-nums">{fmt(at)}</span>
                  </div>
                </div>
                <StatusTag color={LAST_UPDATE_META[type].color} label={type} size="sm" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyLine>Belum ada pembaruan dokumen.</EmptyLine>
      )}
    </Panel>
  );
}
