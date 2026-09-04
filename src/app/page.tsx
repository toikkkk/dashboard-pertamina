"use client";

import React from "react";
import { Hourglass } from "lucide-react";
import { usePsi } from "@/lib/psiStore";
import KpiSummaryCards from "@/components/KpiSummaryCards";
import StatusOverview from "@/components/StatusOverview";
import DocsByLocationChart from "@/components/DocsByLocationChart";
import DocsByPsiTypeChart from "@/components/DocsByPsiTypeChart";
import UpcomingExpiryList from "@/components/UpcomingExpiryList";
import ComplianceChart from "@/components/ComplianceChart";

export default function DashboardPage() {
  const { activeUser } = usePsi();
  const isPending = !activeUser.isRegionalAdmin && !activeUser.location;
  // Admin Regional gets the cross-location comparison dashboard (unchanged);
  // everyone else is always scoped to exactly one location, so their dashboard
  // drops the terminal-vs-terminal widgets in favor of location-focused ones —
  // see the "Dashboard Per Lokasi" brainstorm. `documents`/`getComplianceMetrics`
  // are already correctly scoped either way (see effectiveLocationFilter in
  // psiStore.tsx); this only changes which *widgets* render.
  const isLocationDashboard = !activeUser.isRegionalAdmin && !!activeUser.location;

  return (
    <div>
      {isPending && (
        <div className="mb-3.5 flex items-start gap-2.5 px-4 py-3 rounded-[8px] border border-[#B45309] bg-[#FEF3C7] animate-fadeInUp">
          <Hourglass className="w-4 h-4 text-[#B45309] flex-shrink-0 mt-0.5" strokeWidth={1.8} />
          <p className="text-[12.5px] text-[#78350F] leading-relaxed">
            <strong>Akun Anda menunggu aktivasi.</strong> Anda hanya bisa melihat ringkasan dashboard untuk sementara. Hubungi Admin Regional untuk ditetapkan lokasi &amp; peran agar bisa mengakses dokumen, sirkuler, dan fitur lainnya.
          </p>
        </div>
      )}

      {isLocationDashboard && (
        <h1 className="font-heading text-[19px] font-bold text-[#0F172A] mb-3.5">Dashboard — {activeUser.location}</h1>
      )}

      <KpiSummaryCards />

      <StatusOverview />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-3.5 animate-fadeInUp" style={{ animationDelay: "160ms" }}>
        {isLocationDashboard ? <DocsByPsiTypeChart /> : <DocsByLocationChart />}
        <UpcomingExpiryList />
      </div>

      <div className="animate-fadeInUp" style={{ animationDelay: "240ms" }}>
        <ComplianceChart />
      </div>
    </div>
  );
}
