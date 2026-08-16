"use client";

import React from "react";
import Link from "next/link";
import KpiSummaryCards from "@/components/KpiSummaryCards";
import DashboardOverviewCharts from "@/components/DashboardOverviewCharts";
import ComplianceChart from "@/components/ComplianceChart";
import { Plus } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">

      {/* KPI & SUMMARY */}
      <KpiSummaryCards />

      {/* VISUALISASI OVERVIEW */}
      <DashboardOverviewCharts />
      <ComplianceChart />

      {/* Floating Action Button: Buat Dokumen Baru */}
      <Link
        href="/upload"
        title="Buat Dokumen Baru"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-[#2E7D32] hover:bg-green-700 active:scale-95 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all"
      >
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}
