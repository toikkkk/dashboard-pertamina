"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePsi } from "@/lib/psiStore";
import { Search } from "lucide-react";
import DirectoryCategoryGrid from "@/components/DirectoryCategoryGrid";
import Breadcrumb from "@/components/Breadcrumb";

// Ubin satu lokasi — bahasa visual sama persis dengan CategoryTileCard di
// DirectoryCategoryGrid (satu level lebih dalam): kartu putih rounded-[14px],
// garis aksen kiri 3px (hijau = punya dokumen, abu netral = belum), hover naik +
// bayangan. Dipakai supaya "masuk ke satu lokasi" terasa seperti langkah yang
// konsisten, bukan dua bahasa desain berbeda di dua level Direktori.
function LocationTile({ name, count, onSelect }: { name: string; count: number; onSelect: () => void }) {
  const active = count > 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      className="relative overflow-hidden text-left p-3.5 pl-[18px] rounded-[14px] border border-[#D8E1E4] bg-white hover:border-[#0F3B59] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(15,59,89,.08)] transition-all duration-200 flex flex-col gap-2 min-h-[76px]"
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: active ? "#15803D" : "#E2E8EB" }} aria-hidden />
      <span className={`text-[13px] leading-snug ${active ? "font-bold text-[#0F172A]" : "font-semibold text-[#6b6e72]"}`}>{name}</span>
      <span className={`mt-auto text-[10.5px] font-mono tabular-nums ${active ? "font-bold text-[#15803D]" : "text-[#9a9da0]"}`}>{count} dokumen</span>
    </button>
  );
}

// Level 1 (tanpa ?location=): daftar lokasi. Non-admin yang terkunci ke satu lokasi
// (scopeAll mati) langsung ke Level 2 lokasinya sendiri — daftar berisi satu baris
// saja tidak berguna. Dulu dirender sebagai daftar baris (satu kolom) — 29 baris
// jadi sangat panjang; menutupnya jadi grup collapsed lalu terasa "kosong dan
// kurang menarik" karena satu kartu sempit dikelilingi banyak ruang putih kosong
// di layar lebar. Sekarang ubin grid multi-kolom (sama seperti ubin sub-kategori
// satu level lebih dalam) — 29 lokasi cukup ~6 baris ubin, memakai lebar layar
// dengan baik, dan tidak perlu collapse sama sekali karena sudah cukup padat.
function LocationGrid({ onSelect }: { onSelect: (loc: string) => void }) {
  const { locations, allDocuments } = usePsi();
  const [search, setSearch] = useState("");

  const countFor = (name: string) => allDocuments.filter((d) => d.location === name).length;

  const filtered = locations.filter((loc) => loc.locationName.toLowerCase().includes(search.trim().toLowerCase()));
  const groups = new Map<string, typeof filtered>();
  for (const loc of filtered) {
    const key = loc.locationType;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(loc);
  }
  const typeOrder = ["AFT", "FT", "IT", "Plant"];
  const orderedGroups = Array.from(groups.entries()).sort((a, b) => typeOrder.indexOf(a[0]) - typeOrder.indexOf(b[0]));
  for (const [, list] of orderedGroups) {
    list.sort((a, b) => {
      const ca = countFor(a.locationName);
      const cb = countFor(b.locationName);
      if ((ca > 0) !== (cb > 0)) return ca > 0 ? -1 : 1;
      return a.locationName.localeCompare(b.locationName);
    });
  }

  return (
    <div>
      <div className="relative mb-4 max-w-[320px]">
        <Search className="w-3.5 h-3.5 text-[#9a9da0] absolute left-[11px] top-1/2 -translate-y-1/2" strokeWidth={1.8} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari lokasi..."
          className="w-full min-h-[38px] pl-[34px] pr-3 py-1.5 text-[13px] border border-[#C5CED3] rounded-[8px]"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="py-14 px-5 text-center">
          <Search className="w-[30px] h-[30px] text-[#c3c6c9] mx-auto mb-2.5" strokeWidth={1.5} />
          <p className="text-[13px] text-[#9a9da0]">Tidak ada lokasi yang cocok dengan pencarian Anda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {orderedGroups.map(([type, list]) => {
            const activeCount = list.filter((loc) => countFor(loc.locationName) > 0).length;
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-[11px] font-bold tracking-[.05em] text-[#3a3d40] uppercase">{type}</span>
                  <span className="text-[10.5px] font-mono text-[#9a9da0]">· {list.length} lokasi</span>
                  {activeCount > 0 && (
                    <span className="text-[10.5px] font-mono font-bold text-[#15803D] tabular-nums">· {activeCount} aktif</span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {list.map((loc) => (
                    <LocationTile
                      key={loc.locationName}
                      name={loc.locationName}
                      count={countFor(loc.locationName)}
                      onSelect={() => onSelect(loc.locationName)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DirectoryContent() {
  const { activeUser } = usePsi();
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
  const canPeekOtherLocations = !activeUser.isRegionalAdmin && !!activeUser.location;
  const selectedLocation = searchParams.get("location");
  const canBrowseMultipleLocations = activeUser.isRegionalAdmin || (canPeekOtherLocations && scopeAll);

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
  const gridLocation = canBrowseMultipleLocations ? selectedLocation : activeUser.location;

  const scopeSwitcher = canPeekOtherLocations && (
    <select
      value={scopeAll ? "ALL" : "OWN"}
      onChange={(e) => { setScopeAll(e.target.value === "ALL"); setParam({ location: null, category: null }); }}
      aria-label="Cakupan lokasi"
      className="text-[13px] px-2.5 py-1.5 border border-[#C5CED3] rounded-[8px] bg-white font-semibold min-w-[200px]"
    >
      <option value="OWN">Lokasi saya ({activeUser.location})</option>
      <option value="ALL">Semua lokasi (lihat saja)</option>
    </select>
  );

  return (
    <div>
      {scopeSwitcher && <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">{scopeSwitcher}</div>}

      {gridLocation ? (
        <DirectoryCategoryGrid
          location={gridLocation}
          canWrite={activeUser.isRegionalAdmin || activeUser.location === gridLocation}
          categoryId={searchParams.get("category")}
          onSelectCategory={(id) => setParam({ category: id })}
          baseCrumbs={[
            {
              label: "Direktori",
              onClick: canBrowseMultipleLocations ? () => setParam({ location: null, category: null }) : undefined,
            },
          ]}
        />
      ) : (
        <>
          <Breadcrumb crumbs={[{ label: "Direktori" }]} />
          <LocationGrid onSelect={(loc) => setParam({ location: loc, category: null })} />
        </>
      )}
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
