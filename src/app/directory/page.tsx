"use client";

import React, { useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePsi } from "@/lib/psiStore";
import { psiInsights } from "@/lib/domain/dashboard";
import { useDirectoryOverview } from "@/lib/useDocumentCategories";
import DirectoryCategoryGrid from "@/components/DirectoryCategoryGrid";
import { exportDirectoryXlsx } from "@/lib/exportDirectory";
import RecentAndFavorites from "@/components/directory/RecentAndFavorites";
import Breadcrumb from "@/components/Breadcrumb";
import DirectoryToolbar from "@/components/directory/DirectoryToolbar";
import LocationOverview from "@/components/directory/LocationOverview";
import ComplianceMatrix from "@/components/directory/ComplianceMatrix";
import SearchResults from "@/components/directory/SearchResults";
import ActionList, { ACTION_META, type ActionKind } from "@/components/directory/ActionList";

const ACTIONS: ActionKind[] = ["kedaluwarsa", "segera", "stale", "kosong"];

function DirectoryContent() {
  const { activeUser, documents, allDocuments } = usePsi();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Non-admin: default ke lokasi sendiri; "Semua lokasi" = lihat-saja. Diinisialisasi dari
  // URL (bukan selalu false) — kalau tidak, membuka link langsung ke lokasi lain (refresh,
  // bookmark, kembali dari halaman dokumen) selalu dipaksa balik ke lokasi sendiri karena
  // scopeAll cuma hidup di memori komponen (bug nyata yang dilaporkan user).
  const [scopeAll, setScopeAll] = useState(() => {
    const urlLocation = searchParams.get("location");
    return !!urlLocation && urlLocation !== activeUser.location;
  });
  const [query, setQuery] = useState("");
  const canPeekOtherLocations = !activeUser.isRegionalAdmin && !!activeUser.location;
  const selectedLocation = searchParams.get("location");
  // Membuka lokasi lain lewat URL/matriks otomatis berarti mode "lihat semua lokasi" (hanya-lihat).
  const viewingOther = !!selectedLocation && selectedLocation !== activeUser.location;
  const canBrowseMultipleLocations = activeUser.isRegionalAdmin || (canPeekOtherLocations && (scopeAll || viewingOther));
  const aksiParam = searchParams.get("aksi");
  const aksi = (ACTIONS as string[]).includes(aksiParam ?? "") ? (aksiParam as ActionKind) : null;
  const tab = searchParams.get("v") === "matriks" ? "matriks" : "lokasi";

  // Cakupan data: admin / "Semua lokasi" melihat semua; selain itu hanya lokasi sendiri.
  const sourceDocs = canBrowseMultipleLocations ? allDocuments : documents;
  const scope: string[] | null = canBrowseMultipleLocations ? null : activeUser.location ? [activeUser.location] : [];
  const { overview } = useDirectoryOverview();

  const setParam = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    router.push(`/directory?${next.toString()}`);
  };

  // Lokasi efektif: dari URL kalau admin/scopeAll (boleh pilih bebas), selalu lokasi
  // sendiri kalau non-admin dan scopeAll mati (grid satu kartu tidak berguna).
  // Tab Matriks (semua lokasi, hanya-lihat) tersedia untuk semua user; non-admin tanpa lokasi
  // terpilih yang membuka Matriks tidak dipaksa masuk ke grid lokasinya sendiri.
  const matrixView = tab === "matriks" && !selectedLocation && !searchParams.get("category");
  const gridLocation = canBrowseMultipleLocations ? selectedLocation : matrixView ? null : activeUser.location;

  const counts = useMemo(() => {
    const ins = psiInsights(sourceDocs, Date.now());
    let kosong: number | null = null;
    if (overview) {
      kosong = 0;
      for (const l of overview.locations) {
        if (scope && !scope.includes(l.name)) continue;
        for (const it of overview.items) if ((overview.cells[l.name]?.[it.name]?.n ?? 0) === 0) kosong += 1;
      }
    }
    return { kedaluwarsa: ins.overdue.length, segera: ins.expiring.length, stale: ins.stale.length, kosong } as Record<ActionKind, number | null>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceDocs, overview, canBrowseMultipleLocations, activeUser.location]);

  const openCategory = (location: string, categoryId: string) => setParam({ location, category: categoryId, aksi: null });
  const openLocation = (location: string) => setParam({ location, category: null, aksi: null });
  const root = () => { setQuery(""); setParam({ location: null, category: null, aksi: null }); };

  const scopeSwitcher = canPeekOtherLocations && (
    <select
      value={canBrowseMultipleLocations ? "ALL" : "OWN"}
      onChange={(e) => { setScopeAll(e.target.value === "ALL"); setParam({ location: null, category: null, aksi: null }); }}
      aria-label="Cakupan lokasi"
      className="text-[13px] px-2.5 py-1.5 border border-[#C5CED3] rounded-[8px] bg-white font-semibold min-w-[200px]"
    >
      <option value="OWN">Lokasi saya ({activeUser.location})</option>
      <option value="ALL">Semua lokasi (lihat saja)</option>
    </select>
  );

  const searching = query.trim().length > 0;
  const ownGridRoot = !canBrowseMultipleLocations && gridLocation === activeUser.location && !searchParams.get("category");
  const showTabs = (!gridLocation || ownGridRoot) && !aksi && !searching;

  let content: React.ReactNode;
  if (searching) {
    content = (
      <>
        <Breadcrumb crumbs={[{ label: "Direktori", onClick: () => setQuery("") }, { label: "Hasil pencarian" }]} />
        <SearchResults query={query} docs={sourceDocs} />
      </>
    );
  } else if (aksi) {
    content = (
      <>
        <Breadcrumb crumbs={[{ label: "Direktori", onClick: root }, { label: "Perlu tindakan" }, { label: ACTION_META[aksi].label }]} />
        <ActionList kind={aksi} docs={sourceDocs} overview={overview} scope={scope} onOpen={openCategory} />
      </>
    );
  } else if (gridLocation) {
    content = (
      <DirectoryCategoryGrid
        location={gridLocation}
        canWrite={activeUser.isRegionalAdmin || activeUser.location === gridLocation}
        categoryId={searchParams.get("category")}
        onSelectCategory={(id) => setParam({ category: id })}
        baseCrumbs={[{ label: "Direktori", onClick: canBrowseMultipleLocations ? root : undefined }]}
      />
    );
  } else if (!overview) {
    content = <div className="py-14 text-center text-[13px] text-[#9a9da0]">Memuat direktori...</div>;
  } else if (tab === "matriks") {
    content = (
      <>
        <RecentAndFavorites />
        <Breadcrumb crumbs={[{ label: "Direktori" }, { label: "Matriks kepatuhan" }]} />
        <ComplianceMatrix overview={overview} scope={null} onOpen={openCategory} onOpenLocation={openLocation} />
      </>
    );
  } else {
    content = (
      <>
        <RecentAndFavorites />
        <Breadcrumb crumbs={[{ label: "Direktori" }]} />
        <LocationOverview overview={overview} scope={scope} onSelect={openLocation} />
      </>
    );
  }

  return (
    <div className="min-w-0 max-w-full">
      {scopeSwitcher && <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">{scopeSwitcher}</div>}
      <DirectoryToolbar
        query={query}
        onQuery={(q) => { setQuery(q); if (q.trim() && aksi) setParam({ aksi: null }); }}
        counts={counts}
        active={searching ? null : aksi}
        onAction={(k) => { setQuery(""); setParam({ aksi: k }); }}
        onExport={() =>
          exportDirectoryXlsx({
            docs: gridLocation ? sourceDocs.filter((d) => d.location === gridLocation) : sourceDocs,
            overview,
            label: gridLocation ?? (canBrowseMultipleLocations ? "Semua-lokasi" : activeUser.location ?? "Direktori"),
          })
        }
        tab={showTabs ? tab : null}
        onTab={(t) => setParam({ v: t === "matriks" ? "matriks" : null })}
      />
      {content}
    </div>
  );
}

export default function DirectoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Memuat direktori...</div>}>
      <DirectoryContent />
    </Suspense>
  );
}
