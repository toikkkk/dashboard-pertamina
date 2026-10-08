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
  const { activeUser, allDocuments } = usePsi();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Tab Direktori SAMA untuk semua user (Admin Regional maupun user per lokasi): selalu mulai dari daftar semua lokasi
  // (kartu progres + tab Matriks), bisa membuka lokasi mana pun. Hanya HAK UBAH yang berbeda: unggah/pindah/ganti berkas
  // terkunci ke lokasi sendiri (Admin Regional: semua) — dipaksa server (assertLocationWrite), bukan hanya tampilan.
  const [query, setQuery] = useState("");
  const selectedLocation = searchParams.get("location");
  const aksiParam = searchParams.get("aksi");
  const aksi = (ACTIONS as string[]).includes(aksiParam ?? "") ? (aksiParam as ActionKind) : null;
  const tab = searchParams.get("v") === "matriks" ? "matriks" : "lokasi";

  const sourceDocs = allDocuments;
  const scope = null as string[] | null; // semua lokasi untuk semua user
  const { overview } = useDirectoryOverview();

  const setParam = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    router.push(`/directory?${next.toString()}`);
  };

  const gridLocation = selectedLocation;

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
  }, [sourceDocs, overview]);

  const openCategory = (location: string, categoryId: string) => setParam({ location, category: categoryId, aksi: null });
  const openLocation = (location: string) => setParam({ location, category: null, aksi: null });
  const root = () => { setQuery(""); setParam({ location: null, category: null, aksi: null }); };

  const searching = query.trim().length > 0;
  const showTabs = !gridLocation && !aksi && !searching;

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
        baseCrumbs={[{ label: "Direktori", onClick: root }]}
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
            label: gridLocation ?? "Semua-lokasi",
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
