"use client";

import React from "react";
import { HistoryItem, getLastUpdateType } from "@/lib/mockData";

// Poin #7 Klien (Dilema 5-Tahun): tandai apakah update terakhir dokumen ini cuma
// perpanjangan validitas (tanpa perubahan teknis) atau revisi sungguhan (ada perubahan).
export default function UpdateTypeBadge({ history }: { history: HistoryItem[] }) {
  const type = getLastUpdateType(history);

  const styles: Record<typeof type, string> = {
    Baru: "bg-slate-100 text-slate-700 border-[#D9D9D9]",
    Diperpanjang: "bg-blue-50 text-blue-800 border-blue-300",
    Direvisi: "bg-emerald-50 text-emerald-800 border-emerald-300",
  };

  const labels: Record<typeof type, string> = {
    Baru: "Baru Diajukan",
    Diperpanjang: "Diperpanjang (tanpa perubahan)",
    Direvisi: "Direvisi (ada perubahan)",
  };

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${styles[type]}`}>
      {labels[type]}
    </span>
  );
}
