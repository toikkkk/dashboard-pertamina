"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Hourglass } from "lucide-react";
import { usePsi } from "@/lib/psiStore";
import { useMocList } from "@/lib/useMoc";
import { mocInsights, psiInsights, EXPIRING_WITHIN_DAYS } from "@/lib/domain/dashboard";
import DashboardHeader, { type DashboardView, type SummaryPart } from "@/components/dashboard/DashboardHeader";
import MocDashboard from "@/components/dashboard/MocDashboard";
import { PsiRecentUpdates, PsiStaleList } from "@/components/dashboard/PsiFreshness";
import KpiSummaryCards from "@/components/KpiSummaryCards";
import DocsByLocationChart from "@/components/DocsByLocationChart";
import DocsByPsiTypeChart from "@/components/DocsByPsiTypeChart";
import UpcomingExpiryList from "@/components/UpcomingExpiryList";
import ComplianceChart from "@/components/ComplianceChart";

const VIEW_KEY = "dashboard.view";
const SCOPE_KEY = "dashboard.scope";

// localStorage bisa melempar galat (mode privat, data situs diblokir): halaman tetap harus tampil.
const readStore = (key: string): string | null => {
  try { return window.localStorage.getItem(key); } catch { return null; }
};
const writeStore = (key: string, value: string) => {
  try { window.localStorage.setItem(key, value); } catch { /* preferensi tidak tersimpan, tidak masalah */ }
};

function Dashboard() {
  const { activeUser, documents, effectiveLocationFilter, setViewAll: setStoreViewAll } = usePsi();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const isPending = !activeUser.isRegionalAdmin && !activeUser.location;
  const canPickScope = !activeUser.isRegionalAdmin && !!activeUser.location;

  // Pilihan dashboard: URL (?d=moc) menang, lalu pilihan terakhir, lalu PSI.
  const urlView = params.get("d");
  const [storedView, setStoredView] = useState<DashboardView>("psi");
  useEffect(() => { if (readStore(VIEW_KEY) === "moc") setStoredView("moc"); }, []);
  const view: DashboardView = isPending ? "psi" : urlView === "moc" ? "moc" : urlView === "psi" ? "psi" : storedView;
  const chooseView = (v: DashboardView) => {
    setStoredView(v);
    writeStore(VIEW_KEY, v);
    router.replace(v === "moc" ? `${pathname}?d=moc` : pathname, { scroll: false });
  };

  // Mode lihat-saja untuk non-admin: menampilkan semua lokasi. Hanya berlaku di halaman
  // ini (dilepas saat pindah halaman) supaya lencana Navbar dan halaman lain tetap
  // memakai lokasi user; hak ubah tidak berubah sama sekali.
  const [viewAll, setViewAll] = useState(false);
  useEffect(() => { if (canPickScope && readStore(SCOPE_KEY) === "all") setViewAll(true); }, [canPickScope]);
  useEffect(() => {
    setStoreViewAll(canPickScope && viewAll);
    return () => setStoreViewAll(false);
  }, [canPickScope, viewAll, setStoreViewAll]);
  const chooseScope = (all: boolean) => { setViewAll(all); writeStore(SCOPE_KEY, all ? "all" : "own"); };

  const allScope = activeUser.isRegionalAdmin ? effectiveLocationFilter === "ALL" : canPickScope && viewAll;
  const scopeLabel = effectiveLocationFilter !== "ALL" ? effectiveLocationFilter : allScope ? "Semua lokasi" : activeUser.location ?? "Regional Jatimbalinus";

  const now = Date.now();
  const psi = useMemo(() => psiInsights(documents, now), [documents]); // eslint-disable-line react-hooks/exhaustive-deps
  const { mocs, error: mocError, isLoading: mocLoading, mutate: mutateMoc } = useMocList(!isPending);
  const scopedMocs = useMemo(
    () => (effectiveLocationFilter === "ALL" ? mocs : mocs.filter((m) => m.location === effectiveLocationFilter)),
    [mocs, effectiveLocationFilter]
  );
  const actor = useMemo(
    () => ({ id: activeUser.id, name: activeUser.name, role: activeUser.role, location: activeUser.location, isRegionalAdmin: activeUser.isRegionalAdmin }),
    [activeUser]
  );
  const moc = useMemo(() => mocInsights(scopedMocs, actor, now), [scopedMocs, actor]); // eslint-disable-line react-hooks/exhaustive-deps

  const parts: SummaryPart[] =
    view === "psi"
      ? [
          psi.overdue.length > 0 && { text: `${psi.overdue.length} dokumen kedaluwarsa`, tone: "bad" as const },
          psi.expiring.length > 0 && { text: `${psi.expiring.length} dokumen berakhir dalam ${EXPIRING_WITHIN_DAYS} hari`, tone: "warn" as const },
          psi.stale.length > 0 && { text: `${psi.stale.length} dokumen belum diperbarui 12 bulan`, tone: "plain" as const },
        ].filter(Boolean) as SummaryPart[]
      : [
          moc.mineCount > 0 && { text: `${moc.mineCount} MOC menunggu Anda`, tone: "warn" as const },
          moc.slaCount > 0 && { text: `${moc.slaCount} lewat batas waktu`, tone: "bad" as const },
        ].filter(Boolean) as SummaryPart[];
  const fallback: SummaryPart =
    view === "psi"
      ? psi.total === 0 ? { text: "Belum ada dokumen PSI", tone: "plain" } : { text: "Semua dokumen PSI masih berlaku", tone: "good" }
      : moc.active > 0 ? { text: `${moc.active} MOC sedang berjalan`, tone: "plain" } : { text: "Belum ada MOC berjalan", tone: "plain" };

  return (
    <div>
      {isPending && (
        <div className="mb-4 flex items-start gap-2.5 px-4 py-3 rounded-[8px] border border-[#B45309] bg-[#FEF3C7] animate-fadeInUp">
          <Hourglass className="w-4 h-4 text-[#B45309] flex-shrink-0 mt-0.5" strokeWidth={1.8} />
          <p className="text-[12.5px] text-[#78350F] leading-relaxed">
            <strong>Akun Anda menunggu aktivasi.</strong> Anda hanya bisa melihat ringkasan dashboard untuk sementara. Hubungi Admin Regional untuk ditetapkan lokasi &amp; peran.
          </p>
        </div>
      )}

      <DashboardHeader
        name={activeUser.name}
        scopeLabel={scopeLabel}
        view={view}
        onView={chooseView}
        hideViewSwitch={isPending}
        canPickScope={canPickScope}
        viewAll={viewAll}
        onViewAll={chooseScope}
        parts={parts}
        fallback={fallback}
        loading={view === "moc" && mocLoading}
      />

      <div key={view} className="animate-fadeIn">
        {view === "psi" ? (
          <>
            <KpiSummaryCards insights={psi} />
            {/* Dua kolom bertumpuk (bukan baris berpasangan) supaya tinggi kartu yang
                berbeda-beda tidak meninggalkan ruang kosong. */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-3.5 items-start">
              <div className="flex flex-col gap-3.5">
                <UpcomingExpiryList items={psi.expiring} />
                {allScope ? <DocsByLocationChart /> : <DocsByPsiTypeChart />}
              </div>
              <div className="flex flex-col gap-3.5">
                <PsiStaleList items={psi.stale} />
                <PsiRecentUpdates items={psi.recent} />
              </div>
            </div>
            <ComplianceChart />
          </>
        ) : (
          <MocDashboard
            data={moc}
            state={mocError ? "error" : mocLoading ? "loading" : "ready"}
            onRetry={() => void mutateMoc()}
            showLocations={effectiveLocationFilter === "ALL"}
          />
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="text-[13px] text-[#3a3d40]">Memuat dashboard…</div>}>
      <Dashboard />
    </Suspense>
  );
}
