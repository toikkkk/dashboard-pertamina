"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Hourglass } from "lucide-react";
import { usePsi } from "@/lib/psiStore";
import { useMocList } from "@/lib/useMoc";
import { EXPIRING_WITHIN_DAYS, mocInsights, psiInsights } from "@/lib/domain/dashboard";
import Greeting from "@/components/dashboard/Greeting";
import type { DashboardView, SummaryPart } from "@/components/dashboard/types";
import PsiDashboardManus from "@/components/dashboard/PsiDashboardManus";
import MocDashboardManus from "@/components/dashboard/MocDashboardManus";
import { readPref, writePref } from "@/lib/localPref";

const VIEW_KEY = "dashboard.view";
const SCOPE_KEY = "dashboard.scope";

function Dashboard() {
  const { activeUser, documents, locations, effectiveLocationFilter, selectedLocationFilter, setSelectedLocationFilter, setViewAll: setStoreViewAll } = usePsi();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const isPending = !activeUser.isRegionalAdmin && !activeUser.location;
  const canPickScope = !activeUser.isRegionalAdmin && !!activeUser.location;

  // Pilihan dashboard: URL (?d=moc) menang, lalu pilihan terakhir, lalu PSI.
  const urlView = params.get("d");
  const [storedView, setStoredView] = useState<DashboardView>("psi");
  useEffect(() => { if (readPref(VIEW_KEY) === "moc") setStoredView("moc"); }, []);
  const view: DashboardView = isPending ? "psi" : urlView === "moc" ? "moc" : urlView === "psi" ? "psi" : storedView;
  const chooseView = (v: DashboardView) => {
    setStoredView(v);
    writePref(VIEW_KEY, v);
    router.replace(v === "moc" ? `${pathname}?d=moc` : pathname, { scroll: false });
  };

  // Mode lihat-saja untuk non-admin: menampilkan semua lokasi. Hanya berlaku di halaman
  // ini (dilepas saat pindah halaman) supaya sisa aplikasi tetap memakai lokasi user;
  // hak ubah tidak berubah sama sekali. Diletakkan di kartu ringkasan (bukan topbar
  // global) karena hanya dashboard yang tahu apa artinya "lihat semua lokasi".
  const [viewAll, setViewAll] = useState(false);
  useEffect(() => { if (canPickScope && readPref(SCOPE_KEY) === "all") setViewAll(true); }, [canPickScope]);
  useEffect(() => {
    setStoreViewAll(canPickScope && viewAll);
    return () => setStoreViewAll(false);
  }, [canPickScope, viewAll, setStoreViewAll]);

  const allScope = activeUser.isRegionalAdmin ? effectiveLocationFilter === "ALL" : canPickScope && viewAll;

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

  const psiParts: (SummaryPart | false)[] = [
    psi.overdue.length > 0 && { text: `${psi.overdue.length} dokumen kedaluwarsa`, tone: "bad" },
    psi.expiring.length > 0 && { text: `${psi.expiring.length} berakhir dalam ${EXPIRING_WITHIN_DAYS} hari`, tone: "warn" },
  ];
  const mocParts: (SummaryPart | false)[] = [
    moc.mineCount > 0 && { text: `${moc.mineCount} MOC menunggu Anda`, tone: "warn" },
    moc.slaCount > 0 && { text: `${moc.slaCount} lewat batas waktu`, tone: "bad" },
  ];
  const parts: SummaryPart[] = (view === "psi" ? psiParts : mocParts).filter((x): x is SummaryPart => Boolean(x));
  const fallback: SummaryPart =
    view === "psi"
      ? psi.total === 0
        ? { text: "belum ada dokumen PSI", tone: "plain" }
        : { text: "semua dokumen PSI masih berlaku", tone: "good" }
      : moc.active > 0
        ? { text: `${moc.active} MOC sedang berjalan`, tone: "plain" }
        : { text: "belum ada MOC berjalan", tone: "plain" };

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

      <Greeting name={activeUser.name} view={view} onView={chooseView} parts={parts} fallback={fallback} />

      {activeUser.isRegionalAdmin && (
        <div className="scope-switcher dashboard-scope-switcher" role="group" aria-label="Cakupan lokasi">
          <label className="sr-only" htmlFor="scope-terminal">Pilih terminal</label>
          <select
            id="scope-terminal"
            className="scope-select"
            value={selectedLocationFilter}
            onChange={(e) => setSelectedLocationFilter(e.target.value)}
          >
            <option value="ALL">Semua terminal</option>
            {locations.map((l) => (
              <option key={l.locationName} value={l.locationName}>{l.locationName}</option>
            ))}
          </select>
        </div>
      )}

      {canPickScope && !isPending && (
        <div className="flex flex-wrap items-center gap-x-3">
          <div className="scope-switcher dashboard-scope-switcher" role="group" aria-label="Cakupan lokasi">
            <button aria-pressed={!viewAll} className={!viewAll ? "scope-active" : ""} onClick={() => { setViewAll(false); writePref(SCOPE_KEY, "own"); }}>
              {activeUser.location}
            </button>
            <button aria-pressed={viewAll} className={viewAll ? "scope-active" : ""} onClick={() => { setViewAll(true); writePref(SCOPE_KEY, "all"); }}>
              Semua lokasi <span className="view-only">lihat saja</span>
            </button>
          </div>
          {/* Pilihan ini diingat di browser; penanda ini mencegah salah mengira angka semua lokasi sebagai angka terminal sendiri. */}
          {viewAll && (
            <span role="status" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0F172A]">
              <span className="w-2 h-[3px] rounded-full bg-[#B45309]" aria-hidden />
              Menampilkan semua lokasi
            </span>
          )}
        </div>
      )}

      <div id="dashboard-panel" role="tabpanel" aria-label={view === "psi" ? "Dashboard PSI" : "Dashboard MOC"} key={view}>
        {view === "psi" ? (
          <PsiDashboardManus
            insights={psi}
            documents={documents}
            locations={locations}
            scope={allScope ? "location" : "type"}
            locationFilter={effectiveLocationFilter}
          />
        ) : (
          <MocDashboardManus insights={moc} nowMs={now} showLocations={effectiveLocationFilter === "ALL"} />
        )}
      </div>
      {view === "moc" && mocError && (
        <p role="alert" className="mt-3 text-[12.5px] font-semibold text-[#DC2626]">
          Data MOC belum bisa dimuat.{" "}
          <button type="button" onClick={() => void mutateMoc()} className="underline">Coba lagi</button>
        </p>
      )}
      {view === "moc" && mocLoading && !mocError && (
        <p className="mt-3 text-[12px] text-[#6B6E72]" role="status">Memuat data MOC…</p>
      )}
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
