"use client";

// Konten Dashboard PSI, porting DOM/kelas dari desain Manus (lihat design.md di root
// proyek dan src/styles/shell.css) — diberi data dari lib/domain/dashboard.ts &
// getComplianceMetrics(), bukan data contoh.
import React, { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronRight, ChevronDown, FileClock, ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import type { DocumentItem } from "@/lib/domain/types";
import { EXPIRING_WITHIN_DAYS, completenessByChapter, completenessByLocation, psiInsights } from "@/lib/domain/dashboard";
import { useDirectoryOverview, useDocumentCategorySummary } from "@/lib/useDocumentCategories";
import SectionCard from "@/components/dashboard/SectionCard";
import DashboardListModal from "@/components/dashboard/DashboardListModal";
import { StatusDot, StatusPill, type Severity } from "@/components/dashboard/severity";
import { PSI_CHAPTERS, psiSubDocumentByName } from "@/lib/domain/psiSubChapters";

// Ubin "kotak-kotak" dipakai di dalam popup DashboardListModal — gaya yang sama
// persis dengan CategoryTileCard di Direktori (border+radius+aksen kiri berwarna),
// supaya tampilan popup ini konsisten dengan bahasa visual yang sudah ada, bukan
// bahasa baru lagi.
function DashboardTile({ href, accentColor, title, children }: { href: string; accentColor: string; title: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="relative overflow-hidden block text-left p-3.5 pl-[18px] rounded-[14px] border border-[#D8E1E4] bg-white hover:border-[#0F3B59] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(15,59,89,.08)] transition-all duration-200"
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: accentColor }} aria-hidden />
      <div className="text-[12.5px] font-bold text-[#0F172A] leading-snug mb-1">{title}</div>
      {children}
    </Link>
  );
}

type Insights = ReturnType<typeof psiInsights>;

const fmtDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

// ------------------------------------------------------------------ KPI grid

function MetricGrid({ insights, locationFilter }: { insights: Insights; locationFilter: string }) {
  const pct = (n: number) => (insights.total > 0 ? Math.round((n / insights.total) * 100) : 0);
  // Kartu yang punya padanan "Perlu tindakan" di Direktori membuka daftar itu dengan cakupan terminal yang sama
  // dengan angka di kartu (locationFilter = "ALL" atau satu terminal).
  const directoryHref = (aksi: "segera" | "stale") => `/directory?aksi=${aksi}&lokasi=${encodeURIComponent(locationFilter)}`;
  const metrics: { label: string; value: number; percentage: number; severity: Severity; note: string; href: string }[] = [
    { label: "Approved", value: insights.approved, percentage: pct(insights.approved), severity: "baik", note: "masih berlaku", href: "/directory" },
    { label: "Kedaluwarsa", value: insights.overdue.length, percentage: pct(insights.overdue.length), severity: "kritis", note: "melewati 5 tahun", href: "/dilemma" },
    { label: "Berakhir ≤ 90 hari", value: insights.expiring.length, percentage: pct(insights.expiring.length), severity: "peringatan", note: "perlu dijadwalkan", href: directoryHref("segera") },
    { label: "Perlu evaluasi tahunan", value: insights.stale.length, percentage: pct(insights.stale.length), severity: "revisi", note: "belum ditinjau > 12 bln", href: directoryHref("stale") },
  ];
  return (
    <div className="metric-grid">
      {metrics.map((m, i) => (
        <Link key={m.label} href={m.href} className={`section-card metric-card metric-card-${i + 1}`}>
          <div className="metric-top">
            <span>{m.label}</span>
            <ArrowUpRight className="h-4 w-4" />
          </div>
          <div className="metric-value-row">
            <strong>{m.value}</strong>
            <span>{m.percentage}%</span>
          </div>
          <div className="metric-note">
            <StatusDot severity={m.severity} /> {m.note}
          </div>
        </Link>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ lists

function ExpiringList({ items }: { items: Insights["expiring"] }) {
  // Tombol "Lihat semua" DULU mengarah ke /dilemma — itu sebenarnya bug tersendiri:
  // /dilemma menyaring dokumen yang SUDAH lewat (isDocOverdue), sedangkan panel ini
  // menampilkan `insights.expiring` = dokumen yang BELUM lewat, cuma tinggal ≤90
  // hari lagi — dua dataset yang beda sama sekali. Sekarang popup ini pakai `items`
  // yang sama persis dengan yang dirender panelnya, jadi datanya pasti konsisten.
  const [modalOpen, setModalOpen] = useState(false);
  const shown = items.slice(0, 5);
  return (
    <SectionCard
      title="Segera kedaluwarsa"
      action={items.length > 0 ? <button type="button" onClick={() => setModalOpen(true)} className="card-action">Lihat semua <ChevronRight className="h-3.5 w-3.5" /></button> : undefined}
      className="span-5"
      state={shown.length > 0 ? "ready" : "empty"}
      emptyLabel={`dokumen yang berakhir dalam ${EXPIRING_WITHIN_DAYS} hari`}
    >
      <div className="list-stack">
        {shown.map(({ doc, daysLeft }) => (
          <Link className="document-row" key={doc.id} href={`/document/${doc.id}`}>
            <div className="document-icon"><FileClock className="h-4 w-4" /></div>
            <div className="row-main"><strong>{doc.title}</strong><span>{doc.location}</span></div>
            <div className={`row-end ${daysLeft <= 30 ? "row-end-critical" : ""}`}>
              <strong>{fmtDate(doc.expiryDate)}</strong>
              <span>{daysLeft} hari lagi</span>
            </div>
          </Link>
        ))}
      </div>
      <DashboardListModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Segera Kedaluwarsa"
        items={items}
        emptyLabel={`dokumen yang berakhir dalam ${EXPIRING_WITHIN_DAYS} hari`}
        renderTile={({ doc, daysLeft }) => (
          <DashboardTile href={`/document/${doc.id}`} accentColor={daysLeft <= 30 ? "#DC2626" : "#B45309"} title={doc.title}>
            <div className="text-[11px] text-[#3a3d40] font-semibold">{doc.location}</div>
            <div className="text-[10.5px] font-mono text-[#9a9da0] mt-0.5">{fmtDate(doc.expiryDate)} · {daysLeft} hari lagi</div>
          </DashboardTile>
        )}
      />
    </SectionCard>
  );
}

// Terminal (atau sub-dokumen, bila satu terminal dipilih) yang paling mendesak: berapa dokumen sudah kedaluwarsa
// (merah) dan berapa berakhir <= 90 hari (kuning), yang terparah di atas. Klik membuka daftar yang sesuai.
function UrgentByGroup({ insights, locationFilter }: { insights: Insights; locationFilter: string }) {
  const [modalOpen, setModalOpen] = useState(false);
  const bySubDoc = locationFilter !== "ALL";
  const now = Date.now();
  type Group = { key: string; name: string; overdue: number; soon: number; oldestDays: number; nextDays: number; href: string };
  const map = new Map<string, Group>();
  const touch = (doc: DocumentItem): Group => {
    const key = bySubDoc ? doc.categoryId ?? doc.categoryName ?? "-" : doc.location;
    let g = map.get(key);
    if (!g) {
      const name = bySubDoc ? doc.categoryName ?? "Tanpa sub-dokumen" : doc.location;
      const href = bySubDoc
        ? doc.categoryId
          ? `/directory?location=${encodeURIComponent(doc.location)}&category=${encodeURIComponent(doc.categoryId)}`
          : `/directory?location=${encodeURIComponent(doc.location)}`
        : `/directory?aksi=kedaluwarsa&lokasi=${encodeURIComponent(doc.location)}`;
      g = { key, name, overdue: 0, soon: 0, oldestDays: 0, nextDays: Infinity, href };
      map.set(key, g);
    }
    return g;
  };
  for (const doc of insights.overdue) {
    const g = touch(doc);
    g.overdue++;
    const days = Math.floor((now - new Date(doc.expiryDate + "T00:00:00").getTime()) / 86_400_000);
    if (days > g.oldestDays) g.oldestDays = days;
  }
  for (const { doc, daysLeft } of insights.expiring) {
    const g = touch(doc);
    g.soon++;
    if (daysLeft < g.nextDays) g.nextDays = daysLeft;
  }
  const rows = Array.from(map.values()).sort((a, b) => b.overdue - a.overdue || b.soon - a.soon || a.name.localeCompare(b.name));
  const shown = rows.slice(0, 7);
  const max = Math.max(1, ...rows.map((r) => r.overdue + r.soon));
  const age = (days: number) => (days < 60 ? `${days} hari` : `${Math.round(days / 30.4)} bln`);
  return (
    <SectionCard
      title={bySubDoc ? "Sub-dokumen paling mendesak" : "Terminal paling mendesak"}
      className="span-4"
      state={rows.length > 0 ? "ready" : "empty"}
      emptyLabel="dokumen mendesak"
    >
      <div className="completeness-legend">
        <span><i style={{ background: "#DC2626" }} /> Kedaluwarsa</span>
        <span><i style={{ background: "#B45309" }} /> Berakhir ≤ 90 hari</span>
      </div>
      <div className="urgent-rows">
        {shown.map((r) => (
          <Link key={r.key} href={r.href} className="urgent-row insight-link-row">
            <div className="urgent-name">
              <strong title={r.name}>{r.name}</strong>
              <span>
                {r.overdue > 0 ? `tertua lewat ${age(r.oldestDays)}` : `berakhir ${r.nextDays} hari lagi`}
              </span>
            </div>
            <div className="stack-track">
              <i style={{ width: `${(r.overdue / max) * 100}%`, background: "#DC2626" }} />
              <i style={{ width: `${(r.soon / max) * 100}%`, background: "#B45309" }} />
            </div>
            <div className="urgent-count">
              {r.overdue > 0 && <b style={{ color: "#DC2626" }}>{r.overdue}</b>}
              {r.soon > 0 && <b style={{ color: "#B45309" }}>{r.soon}</b>}
            </div>
          </Link>
        ))}
      </div>
      {rows.length > 7 && (
        <button type="button" className="completeness-more" onClick={() => setModalOpen(true)}>
          Lihat semua {rows.length} {bySubDoc ? "sub-dokumen" : "terminal"}
        </button>
      )}
      <DashboardListModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={bySubDoc ? "Sub-dokumen Paling Mendesak" : "Terminal Paling Mendesak"}
        unit={bySubDoc ? "sub-dokumen" : "terminal"}
        pageSize={30}
        items={rows}
        emptyLabel="dokumen mendesak"
        renderTile={(r) => (
          <DashboardTile href={r.href} accentColor={r.overdue > 0 ? "#DC2626" : "#B45309"} title={r.name}>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              {r.overdue > 0 && <span style={{ color: "#DC2626" }}>{r.overdue} kedaluwarsa</span>}
              {r.soon > 0 && <span style={{ color: "#B45309" }}>{r.soon} ≤ 90 hari</span>}
            </div>
            <div className="text-[10.5px] text-[#6b6e72] mt-0.5">
              {r.overdue > 0 ? `tertua lewat ${age(r.oldestDays)}` : `berakhir ${r.nextDays} hari lagi`}
            </div>
          </DashboardTile>
        )}
      />
    </SectionCard>
  );
}

function RecentUpdates({ items }: { items: Insights["recent"] }) {
  // `items` sekarang datang TIDAK dipotong dari psiInsights() (lihat domain/dashboard.ts)
  // — panel ini sendiri yang memotong ke 5 teratas, sisanya lewat popup "Lihat semua".
  const [modalOpen, setModalOpen] = useState(false);
  const shown = items.slice(0, 5);
  return (
    <SectionCard
      title="Pembaruan terbaru"
      action={items.length > 5 ? <button type="button" onClick={() => setModalOpen(true)} className="card-action">Lihat semua <ChevronRight className="h-3.5 w-3.5" /></button> : undefined}
      className="span-3"
      state={shown.length > 0 ? "ready" : "empty"}
      emptyLabel="pembaruan dokumen"
    >
      <div className="update-stack">
        {shown.map(({ doc, entry, type, at }) => (
          <Link className="update-row" key={entry.id} href={`/document/${doc.id}`}>
            <div className="update-line"><span className="update-dot" /></div>
            <div className="row-main"><strong>{doc.title}</strong><span>{doc.location} <i /> {entry.actorName}</span></div>
            <div className="update-meta">
              <StatusPill severity={type === "Baru" ? "baik" : type === "Direvisi" ? "revisi" : "peringatan"}>{type}</StatusPill>
              <span>{new Date(at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}</span>
            </div>
          </Link>
        ))}
      </div>
      <DashboardListModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Pembaruan Terbaru"
        items={items}
        emptyLabel="pembaruan dokumen"
        renderTile={({ doc, entry, type, at }) => {
          const color = type === "Baru" ? "#0F3B59" : type === "Direvisi" ? "#6D28D9" : "#B45309";
          return (
            <DashboardTile href={`/document/${doc.id}`} accentColor={color} title={doc.title}>
              <div className="text-[11px] text-[#3a3d40] font-semibold">{doc.location} · {entry.actorName}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <StatusPill severity={type === "Baru" ? "baik" : type === "Direvisi" ? "revisi" : "peringatan"}>{type}</StatusPill>
                <span className="text-[10.5px] font-mono text-[#9a9da0]">{new Date(at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span>
              </div>
            </DashboardTile>
          );
        }}
      />
    </SectionCard>
  );
}

// ------------------------------------------------------------------ compliance

function barColor(pct: number) {
  if (pct >= 100) return "#15803D";
  if (pct >= 80) return "#16A34A";
  if (pct >= 50) return "#B45309";
  return "#DC2626";
}

function ComplianceTable({
  documents,
  locations,
  scope,
}: {
  documents: DocumentItem[];
  locations: { locationName: string; locationType: string; targets: Record<string, number> }[];
  scope: "type" | "location";
}) {
  // Satu terminal: hanya rincian per jenis PSI. Banyak terminal: pilihan per lokasi / per
  // jenis (default per lokasi). `pref` diingat agar tidak reset saat berpindah cakupan.
  const [pref, setPref] = useState<"location" | "type">("location");
  const detail: "location" | "type" = scope === "location" ? pref : "type";
  const setDetail = setPref;
  // Baris per lokasi dikelompokkan per tipe (AFT/FT/IT/Plant) dan disembunyikan
  // secara default — daftar lokasi sudah 29 baris (dari 5), tabel jadi sangat
  // panjang kalau semua langsung tampil. Klik judul kelompok untuk membuka isinya.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleGroup = (type: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });

  // Kolom Approved/Target/Kepatuhan bisa diurutkan — klik judul kolom untuk
  // mengurutkan, klik lagi untuk membalik arah. Default sama seperti sebelumnya:
  // terpenuhi terbanyak dulu (diminta 2026-10-07). "Kekurangan" (gap) dihapus
  // 2026-09-29 — dihitung dari `target`, yang cuma diisi untuk 5 dari 29 lokasi
  // (lihat location_targets); tanpa maksimal dokumen yang jelas untuk 24 lokasi
  // lainnya, angka kekurangannya tidak bermakna/menyesatkan.
  type SortCol = "approved" | "target" | "pct";
  const [sortCol, setSortCol] = useState<SortCol>("approved");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir("asc");
    }
  };
  function bySort<T extends { approved: number; target: number; pct: number }>(rows: T[]): T[] {
    return [...rows].sort((a, b) => (sortDir === "asc" ? a[sortCol] - b[sortCol] : b[sortCol] - a[sortCol]));
  }
  const SortHeader = ({ col, label }: { col: SortCol; label: string }) => (
    <th>
      <button type="button" onClick={() => toggleSort(col)} className="compliance-sort-btn">
        {label}
        {sortCol === col ? (
          sortDir === "asc" ? <ArrowUp className="w-3 h-3" strokeWidth={2.2} /> : <ArrowDown className="w-3 h-3" strokeWidth={2.2} />
        ) : (
          <ChevronsUpDown className="w-3 h-3" strokeWidth={2} />
        )}
      </button>
    </th>
  );

  // "Per jenis PSI" sekarang berbasis 33 sub-kategori PSI First Column (lihat
  // document_categories) — bukan lagi 4 psi_type lama dengan target manual yang
  // cuma pernah diisi untuk 5 lokasi asli. target = jumlah lokasi yang punya
  // kategori itu, approved = jumlah lokasi yang kategorinya ✅ (lihat
  // api/document-categories/summary). Bisa 33 baris — sama seperti "Per lokasi",
  // cuma tampilkan yang paling butuh perhatian dulu, sisanya di balik "Tampilkan semua".
  const { categories: categorySummary, locations: locationSummary } = useDocumentCategorySummary(true);
  // Dikelompokkan per cluster Excel client (Sub Chapter A, B.1–B.5); di dalam cluster urut dari
  // Terpenuhi terbanyak (atau kolom yang diklik). Akordeon: awalnya semua tertutup (6 baris
  // ringkas) dan hanya satu cluster terbuka sekaligus, supaya halaman tidak memanjang —
  // 53 baris terbuka sekaligus membuat user harus scroll jauh.
  const [openType, setOpenType] = useState<string | null>(null);
  const toggleTypeGroup = (key: string) => setOpenType((cur) => (cur === key ? null : key));
  const byTypeAll = categorySummary.map((c) => {
    const ex = psiSubDocumentByName(c.name);
    return { label: c.name, no: ex?.no ?? null, chapter: ex?.chapter ?? null, approved: c.approved, target: c.target, pct: c.pct };
  });
  const byTypeGroups = PSI_CHAPTERS.map((ch) => {
    const children = bySort(byTypeAll.filter((r) => r.chapter === ch.key));
    const approved = children.reduce((sum, r) => sum + r.approved, 0);
    const target = children.reduce((sum, r) => sum + r.target, 0);
    const pct = target > 0 ? Math.min(100, Math.round((approved / target) * 100)) : 0;
    return { key: ch.key, label: ch.label, title: ch.title, approved, target, pct, children };
  }).filter((g) => g.children.length > 0);

  const byLocation = locations.map((loc) => {
    // Dasar kepatuhan = sub-kategori PSI baku yang punya dokumen berlaku di lokasi itu
    // (sama persis dengan grid Direktori), bukan target manual lama yang hanya terisi
    // untuk 5 lokasi.
    const sum = locationSummary.find((l) => l.location === loc.locationName);
    const approved = sum?.approved ?? 0;
    const target = sum?.target ?? 0;
    const pct = target > 0 ? Math.min(100, Math.round((approved / target) * 100)) : 0;
    return { label: loc.locationName, sublabel: "Lokasi", approved, target, pct, locationType: loc.locationType };
  });
  const typeOrder = ["AFT", "FT", "IT", "Plant"];
  const byLocationGroups = bySort(
    Array.from(new Set(locations.map((l) => l.locationType)))
      .sort((a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b))
      .map((type) => {
        const children = bySort(byLocation.filter((r) => r.locationType === type));
        const approved = children.reduce((s, r) => s + r.approved, 0);
        const target = children.reduce((s, r) => s + r.target, 0);
        const pct = target > 0 ? Math.min(100, Math.round((approved / target) * 100)) : 0;
        return { label: type, sublabel: `${children.length} lokasi`, approved, target, pct, children };
      })
  );

  // Total/persentase di header selalu dari SELURUH baris (bukan cuma yang sedang
  // ditampilkan) — supaya angka "Kepatuhan keseluruhan" tidak berubah saat daftar
  // dibuka/ditutup atau "Tampilkan semua" belum diklik.
  const totals = (detail === "location" ? byLocationGroups : byTypeGroups).reduce(
    (acc, r) => ({ approved: acc.approved + r.approved, target: acc.target + r.target }),
    { approved: 0, target: 0 }
  );
  const overallPct = totals.target > 0 ? Math.round((totals.approved / totals.target) * 100) : 0;

  return (
    <SectionCard
      title="Kepatuhan dokumen"
      className="span-12"
      state={(detail === "location" ? byLocationGroups.length : byTypeGroups.length) > 0 ? "ready" : "empty"}
      emptyLabel="target kepatuhan dokumen"
    >
      {/* Dulu ditempel kecil (9,5px) di pojok judul kartu, gampang kelewat dan di
          ponsel jadi berdesakan dengan judul sampai tabel di bawahnya terpotong.
          Sekarang baris sendiri, ukuran wajar, selebar yang dibutuhkan — sama
          bahasa visual dengan "Per Lokasi / Semua Dokumen" di Direktori. */}
      {scope === "location" && (
        <div className="compliance-detail-switcher">
          <button type="button" className={detail === "location" ? "is-active" : ""} onClick={() => setDetail("location")}>Per Lokasi</button>
          <button type="button" className={detail === "type" ? "is-active" : ""} onClick={() => setDetail("type")}>Per Jenis PSI</button>
        </div>
      )}
      <div className="compliance-summary">
        <div><span>Kepatuhan keseluruhan</span><strong>{overallPct}<small>%</small></strong></div>
        <div className="summary-divider" />
        <div><span>Sub-kategori terpenuhi</span><strong className="mono-summary">{totals.approved} <small>/ {totals.target}</small></strong></div>
      </div>
      <div className="compliance-table-wrap">
        <table>
          <thead>
            <tr>
              <th>{detail === "location" ? "Lokasi" : "Jenis PSI"}</th>
              <SortHeader col="approved" label="Terpenuhi" />
              {/* Target dihilangkan di "Per Jenis PSI" — di sana angkanya cuma
                  jumlah lokasi yang punya kategori itu (bukan target dari client
                  seperti di "Per Lokasi"), jadi hampir selalu 29 dan tidak
                  informatif. */}
              {detail === "location" && <SortHeader col="target" label="Sub-kategori" />}
              <SortHeader col="pct" label="Kepatuhan" />
            </tr>
          </thead>
          <tbody>
            {detail === "type"
              ? byTypeGroups.map((g) => {
                  const isOpen = openType === g.key;
                  return (
                    <React.Fragment key={g.key}>
                      <tr className="compliance-group-row" onClick={() => toggleTypeGroup(g.key)}>
                        <td>
                          <span className="compliance-group-toggle">
                            {isOpen ? <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.2} /> : <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.2} />}
                            <strong>{g.title}</strong>
                          </span>
                          <span>{g.label} · {g.children.length} sub-dokumen</span>
                        </td>
                        <td className="mono">{g.approved}</td>
                        <td>
                          <div className="table-progress"><span style={{ width: `${g.pct}%`, background: barColor(g.pct) }} /></div>
                          <b>{g.pct}%</b>
                        </td>
                      </tr>
                      {isOpen &&
                        g.children.map((row) => (
                          <tr key={row.label} className="compliance-child-row">
                            <td><strong>{row.label}</strong></td>
                            <td className="mono">{row.approved}</td>
                            <td>
                              <div className="table-progress"><span style={{ width: `${row.pct}%`, background: barColor(row.pct) }} /></div>
                              <b>{row.pct}%</b>
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })
              : byLocationGroups.map((group) => {
                  const isOpen = expanded.has(group.label);
                  return (
                    <React.Fragment key={group.label}>
                      <tr className="compliance-group-row" onClick={() => toggleGroup(group.label)}>
                        <td>
                          <span className="compliance-group-toggle">
                            {isOpen ? <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.2} /> : <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.2} />}
                            <strong>{group.label}</strong>
                          </span>
                          <span>{group.sublabel}</span>
                        </td>
                        <td className="mono">{group.approved}</td>
                        <td className="mono">{group.target}</td>
                        <td>
                          <div className="table-progress"><span style={{ width: `${group.pct}%`, background: barColor(group.pct) }} /></div>
                          <b>{group.pct}%</b>
                        </td>
                      </tr>
                      {isOpen &&
                        group.children.map((row) => (
                          <tr key={row.label} className="compliance-child-row">
                            <td><strong>{row.label}</strong><span>{row.sublabel}</span></td>
                            <td className="mono">{row.approved}</td>
                            <td className="mono">{row.target}</td>
                            <td>
                              <div className="table-progress"><span style={{ width: `${row.pct}%`, background: barColor(row.pct) }} /></div>
                              <b>{row.pct}%</b>
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ------------------------------------------------------------------ infografik

const COMPLETENESS_COLORS = { ok: "#15803D", review: "#B45309", missing: "#E3A3A3" };

// Nama ringkas sub chapter untuk baris grafik: "B.1 Design & Technology" (label Excel semuanya "Sub Chapter B").
function chapterShortName(ch: { key: string; title: string }): string {
  const name = ch.title.replace(/^\d+\.\s*/, "").replace(/^Dokumen\s+/, "").replace(/\s*\(.*\)\s*$/, "");
  return `${ch.key} ${name}`;
}

function CompletenessLegend() {
  return (
    <div className="completeness-legend">
      <span><i style={{ background: COMPLETENESS_COLORS.ok }} /> Terpenuhi</span>
      <span><i style={{ background: COMPLETENESS_COLORS.review }} /> Perlu ditinjau</span>
      <span><i style={{ background: COMPLETENESS_COLORS.missing }} /> Belum ada dokumen</span>
    </div>
  );
}

function StackedBar({ ok, review, missing }: { ok: number; review: number; missing: number }) {
  const total = Math.max(1, ok + review + missing);
  return (
    <div className="stack-track" role="img" aria-label={`${ok} terpenuhi, ${review} perlu ditinjau, ${missing} belum ada dokumen`}>
      <i style={{ width: `${(ok / total) * 100}%`, background: COMPLETENESS_COLORS.ok }} />
      <i style={{ width: `${(review / total) * 100}%`, background: COMPLETENESS_COLORS.review }} />
      <i style={{ width: `${(missing / total) * 100}%`, background: COMPLETENESS_COLORS.missing }} />
    </div>
  );
}

// Kelengkapan per Sub Chapter: bagian PSI mana yang paling bolong. Tiap baris bisa diklik untuk masuk ke
// isi sub chapter itu (semua sub-dokumennya, bukan hanya yang kosong).
function ChapterCompleteness({ locationFilter, span }: { locationFilter: string; span: string }) {
  const { overview } = useDirectoryOverview();
  const scope = locationFilter === "ALL" ? null : locationFilter;
  const byChapter = overview ? completenessByChapter(overview, scope) : null;
  const rows = byChapter ? PSI_CHAPTERS.map((ch) => ({ ch, c: byChapter[ch.key] })).filter((r) => r.c && r.c.total > 0) : [];
  const sum = rows.reduce((a, r) => ({ ok: a.ok + r.c.ok, total: a.total + r.c.total }), { ok: 0, total: 0 });
  return (
    <SectionCard
      title="Kelengkapan per sub chapter"
      className={`${span} insight-card`}
      state={!overview ? "loading" : rows.length > 0 ? "ready" : "empty"}
      emptyLabel="kelengkapan sub chapter"
    >
      <CompletenessLegend />
      <div className="completeness-rows">
        {rows.map(({ ch, c }) => {
          const body = (
            <>
              <span className="completeness-name" title={ch.title}>{chapterShortName(ch)}</span>
              <StackedBar ok={c.ok} review={c.review} missing={c.missing} />
              <strong>{c.ok}<small>/{c.total}</small></strong>
            </>
          );
          // Semua terminal: Matriks dengan sub chapter ini terbuka. Satu terminal: kartu sub-dokumen terminal itu
          // pada sub chapter ini.
          const href = scope
            ? `/directory?location=${encodeURIComponent(scope)}&bab=${encodeURIComponent(ch.key)}`
            : `/directory?v=matriks&bab=${encodeURIComponent(ch.key)}`;
          return (
            <Link key={ch.key} href={href} className="completeness-row insight-link-row">{body}</Link>
          );
        })}
      </div>
      <div className="completeness-foot">{sum.ok} dari {sum.total} sub-dokumen terpenuhi</div>
    </SectionCard>
  );
}

// Terminal yang paling perlu perhatian (kelengkapan terendah dulu). Hanya untuk tampilan semua terminal.
function TerminalAttention() {
  const { overview } = useDirectoryOverview();
  const [modalOpen, setModalOpen] = useState(false);
  const rows = overview ? completenessByLocation(overview) : [];
  const shown = rows.slice(0, 8);
  return (
    <SectionCard
      title="Terminal yang perlu perhatian"
      className="span-4 insight-card"
      state={!overview ? "loading" : rows.length > 0 ? "ready" : "empty"}
      emptyLabel="kelengkapan terminal"
    >
      <CompletenessLegend />
      <div className="completeness-rows">
        {shown.map((r) => (
          <Link key={r.name} href={`/directory?location=${encodeURIComponent(r.name)}`} className="completeness-row insight-link-row">
            <span className="completeness-name" title={r.name}>{r.name}</span>
            <StackedBar ok={r.ok} review={r.review} missing={r.missing} />
            <strong>{r.pct}<small>%</small></strong>
          </Link>
        ))}
      </div>
      {rows.length > 8 && (
        <button type="button" className="completeness-more" onClick={() => setModalOpen(true)}>
          Lihat semua {rows.length} terminal
        </button>
      )}
      <DashboardListModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Kelengkapan Semua Terminal"
        unit="terminal"
        pageSize={30}
        items={rows}
        emptyLabel="terminal"
        renderTile={(r) => (
          <DashboardTile href={`/directory?location=${encodeURIComponent(r.name)}`} accentColor={barColor(r.pct)} title={r.name}>
            {/* Popup dirender di luar area dashboard, jadi batang memakai gaya inline (bukan kelas .stack-track). */}
            <div style={{ display: "flex", height: 8, borderRadius: 4, background: "#ECEDED", overflow: "hidden", gap: 1 }} role="img" aria-label={`${r.ok} terpenuhi, ${r.review} perlu ditinjau, ${r.missing} belum ada dokumen`}>
              <i style={{ width: `${(r.ok / Math.max(1, r.total)) * 100}%`, background: COMPLETENESS_COLORS.ok }} />
              <i style={{ width: `${(r.review / Math.max(1, r.total)) * 100}%`, background: COMPLETENESS_COLORS.review }} />
              <i style={{ width: `${(r.missing / Math.max(1, r.total)) * 100}%`, background: COMPLETENESS_COLORS.missing }} />
            </div>
            <div className="text-[10.5px] font-mono text-[#6b6e72] mt-1.5">{r.pct}% terpenuhi · {r.ok}/{r.total} sub-dokumen</div>
          </DashboardTile>
        )}
      />
    </SectionCard>
  );
}

// Jadwal kedaluwarsa per tahun: beban kerja pembaruan ke depan.
function ExpiryColumns({ insights, locationFilter, span }: { insights: Insights; locationFilter: string; span: string }) {
  const max = Math.max(1, ...insights.expiryYears.map((e) => e.count));
  const total = insights.expiryYears.reduce((sum, e) => sum + e.count, 0);
  const toneColor = { lewat: "#DC2626", dekat: "#B45309", jauh: "#0F3B59" } as const;
  return (
    <SectionCard title="Jadwal kedaluwarsa" className={`${span} insight-card`} state={total > 0 ? "ready" : "empty"} emptyLabel="jadwal kedaluwarsa">
      <div className="insight-columns" aria-label="Jumlah dokumen yang berakhir per tahun, klik untuk membuka daftarnya">
        {insights.expiryYears.map((e) => {
          // "Lewat" memakai daftar Kedaluwarsa yang sudah ada; tahun lain membuka daftar per tahun.
          const href = e.tone === "lewat"
            ? `/directory?aksi=kedaluwarsa&lokasi=${encodeURIComponent(locationFilter)}`
            : `/directory?tahun=${e.key}&lokasi=${encodeURIComponent(locationFilter)}`;
          const body = (
            <>
              <strong>{e.count}</strong>
              <div className="insight-column-track"><i style={{ height: `${Math.max(e.count > 0 ? 4 : 0, (e.count / max) * 100)}%`, background: toneColor[e.tone] }} /></div>
              <span>{e.label}</span>
            </>
          );
          return e.count > 0 ? (
            <Link key={e.key} href={href} className="insight-column insight-column-link" aria-label={`${e.label}: ${e.count} dokumen`}>{body}</Link>
          ) : (
            <div key={e.key} className="insight-column">{body}</div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ------------------------------------------------------------------ composition

export default function PsiDashboardManus({
  insights,
  documents,
  locations,
  scope,
  locationFilter,
}: {
  insights: Insights;
  documents: DocumentItem[];
  locations: { locationName: string; locationType: string; targets: Record<string, number> }[];
  scope: "type" | "location";
  locationFilter: string;
}) {
  return (
    <div className="dashboard-content page-enter">
      <MetricGrid insights={insights} locationFilter={locationFilter} />
      <div className="content-grid insight-grid">
        <ChapterCompleteness locationFilter={locationFilter} span={locationFilter === "ALL" ? "span-4" : "span-6"} />
        {locationFilter === "ALL" && <TerminalAttention />}
        <ExpiryColumns insights={insights} locationFilter={locationFilter} span={locationFilter === "ALL" ? "span-4" : "span-6"} />
      </div>
      <div className="content-grid content-grid-psi">
        <ExpiringList items={insights.expiring} />
        <UrgentByGroup insights={insights} locationFilter={locationFilter} />
        <RecentUpdates items={insights.recent} />
        <ComplianceTable documents={documents} locations={locations} scope={scope} />
      </div>
    </div>
  );
}
