"use client";

import React from "react";
import { usePsi } from "@/lib/psiStore";
import { CheckCircle2, AlertTriangle, Clock, RotateCcw, LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";

interface KpiCardDef {
  label: string;
  count: number;
  rate: number;
  icon: LucideIcon;
  path: string;
  colorClasses: { icon: string; bar: string; badge: string };
}

export default function KpiSummaryCards() {
  const { documents } = usePsi();
  const router = useRouter();

  const totalDocs = documents.length;
  const approvedCount = documents.filter((d) => d.status === "Approved").length;
  const overdueCount = documents.filter((d) => d.status === "Expired").length;
  const routingCount = documents.filter((d) => d.status === "In Routing").length;
  const revisionCount = documents.filter((d) => d.status === "Revision Required").length;

  const pct = (n: number) => (totalDocs > 0 ? Math.round((n / totalDocs) * 100) : 0);

  const cards: KpiCardDef[] = [
    {
      label: "Sudah Terupdate",
      count: approvedCount,
      rate: pct(approvedCount),
      icon: CheckCircle2,
      path: "/directory?status=Approved",
      colorClasses: { icon: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-600", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    },
    {
      label: "Overdue (Kedaluwarsa)",
      count: overdueCount,
      rate: pct(overdueCount),
      icon: AlertTriangle,
      path: "/dilemma",
      colorClasses: { icon: "bg-rose-100 text-rose-700", bar: "bg-[#D32F2F]", badge: "bg-rose-50 text-rose-700 border-rose-200" },
    },
    {
      label: "Dalam Sirkuler",
      count: routingCount,
      rate: pct(routingCount),
      icon: Clock,
      path: "/directory?status=In+Routing",
      colorClasses: { icon: "bg-amber-100 text-amber-700", bar: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200" },
    },
    {
      label: "Perlu Revisi",
      count: revisionCount,
      rate: pct(revisionCount),
      icon: RotateCcw,
      path: "/directory?status=Revision+Required",
      colorClasses: { icon: "bg-purple-100 text-purple-800", bar: "bg-purple-800", badge: "bg-purple-50 text-purple-800 border-purple-200" },
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          onClick={() => router.push(c.path)}
          className="bg-white rounded-xl p-3.5 border border-[#D9D9D9] shadow-sm hover:shadow-md hover:border-[#D9D9D9] transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.colorClasses.icon}`}>
              <c.icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-[#353535] font-mono">{c.count}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${c.colorClasses.badge}`}>{c.rate}%</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 truncate block">{c.label}</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-2.5">
            <div className={`h-full rounded-full transition-all duration-700 ${c.colorClasses.bar}`} style={{ width: `${c.rate}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
