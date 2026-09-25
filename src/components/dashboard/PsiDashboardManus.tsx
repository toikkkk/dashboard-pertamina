"use client";

// Konten Dashboard PSI, porting DOM/kelas dari desain Manus (lihat design.md di root
// proyek dan src/styles/shell.css) — diberi data dari lib/domain/dashboard.ts &
// getComplianceMetrics(), bukan data contoh.
import React, { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronRight, FileClock, ArrowDownRight } from "lucide-react";
import type { DocumentItem, PSIType } from "@/lib/domain/types";
import { EXPIRING_WITHIN_DAYS, psiInsights } from "@/lib/domain/dashboard";
import SectionCard from "@/components/dashboard/SectionCard";
import { StatusDot, StatusPill, type Severity } from "@/components/dashboard/severity";

type Insights = ReturnType<typeof psiInsights>;
type ComplianceMetrics = {
  totalApproved: number;
  totalTarget: number;
  percentage: number;
  byType: Record<PSIType, { approved: number; target: number; pct: number }>;
};

const PSI_TYPES: PSIType[] = [
  "Informasi Bahan Berbahaya",
  "Informasi Teknologi Proses",
  "Informasi Peralatan",
  "Sistem Tata Kerja",
];

const fmtDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

// ------------------------------------------------------------------ KPI grid

function MetricGrid({ insights }: { insights: Insights }) {
  const pct = (n: number) => (insights.total > 0 ? Math.round((n / insights.total) * 100) : 0);
  const metrics: { label: string; value: number; percentage: number; severity: Severity; note: string; href: string }[] = [
    { label: "Approved", value: insights.approved, percentage: pct(insights.approved), severity: "baik", note: "masih berlaku", href: "/directory?status=Approved" },
    { label: "Kedaluwarsa", value: insights.overdue.length, percentage: pct(insights.overdue.length), severity: "kritis", note: "melewati 5 tahun", href: "/dilemma" },
    { label: "Berakhir ≤ 90 hari", value: insights.expiring.length, percentage: pct(insights.expiring.length), severity: "peringatan", note: "perlu dijadwalkan", href: "#segera-kedaluwarsa" },
    { label: "Belum diperbarui > 12 bln", value: insights.stale.length, percentage: pct(insights.stale.length), severity: "revisi", note: "perlu ditinjau", href: "#belum-diperbarui" },
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
  const shown = items.slice(0, 5);
  return (
    <SectionCard
      title="Segera kedaluwarsa"
      action={<Link href="/dilemma" className="card-action">Lihat semua <ChevronRight className="h-3.5 w-3.5" /></Link>}
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
    </SectionCard>
  );
}

function StaleList({ items }: { items: Insights["stale"] }) {
  const shown = items.slice(0, 5);
  return (
    <SectionCard title="Belum diperbarui > 12 bulan" className="span-4" state={shown.length > 0 ? "ready" : "empty"} emptyLabel="dokumen yang belum diperbarui">
      <div className="list-stack compact-list">
        {shown.map(({ doc, lastUpdate, months }) => (
          <Link className="stale-row" key={doc.id} href={`/document/${doc.id}`}>
            <div className="stale-mark"><ArrowDownRight className="h-3.5 w-3.5" /></div>
            <div className="row-main"><strong>{doc.title}</strong><span>{doc.location} <i /> {new Date(lastUpdate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span></div>
            <span className="months-badge">{months} bln</span>
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

function RecentUpdates({ items }: { items: Insights["recent"] }) {
  return (
    <SectionCard title="Pembaruan terbaru" className="span-3" state={items.length > 0 ? "ready" : "empty"} emptyLabel="pembaruan dokumen">
      <div className="update-stack">
        {items.map(({ doc, entry, type, at }) => (
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
    </SectionCard>
  );
}

// ------------------------------------------------------------------ distribution

const BAR_TONE = ["bar-navy", "bar-slate", "bar-steel", "bar-muted"];

function DistributionChart({ documents, scope }: { documents: DocumentItem[]; scope: "type" | "location" }) {
  const groups = new Map<string, number>();
  if (scope === "type") {
    for (const t of PSI_TYPES) groups.set(t, 0);
    for (const d of documents) groups.set(d.psiType, (groups.get(d.psiType) ?? 0) + 1);
  } else {
    for (const d of documents) groups.set(d.location, (groups.get(d.location) ?? 0) + 1);
  }
  const items = Array.from(groups.entries())
    .map(([label, value]) => ({ label, value }))
    .filter((g) => g.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = documents.length;

  return (
    <SectionCard title="Distribusi dokumen" className="span-5" state={total > 0 ? "ready" : "empty"} emptyLabel="distribusi dokumen">
      <div className="chart-caption">
        <span>{scope === "location" ? "Dokumen per terminal" : "Dokumen per jenis PSI"}</span>
        <strong>{total} <small>total dokumen</small></strong>
      </div>
      <div className="bar-chart">
        {items.map((item, i) => {
          const width = Math.max(5, (item.value / Math.max(1, items[0]?.value ?? 1)) * 100);
          return (
            <div className="bar-row" key={item.label}>
              <span className="bar-label">{item.label}</span>
              <div className="bar-track"><span className={`bar-fill ${BAR_TONE[Math.min(i, 3)]}`} style={{ width: `${width}%` }} /></div>
              <strong>{item.value}</strong>
            </div>
          );
        })}
      </div>
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
  metrics,
  documents,
  locations,
  isAdmin,
  scope,
}: {
  metrics: ComplianceMetrics;
  documents: DocumentItem[];
  locations: { locationName: string; targets: Record<string, number> }[];
  isAdmin: boolean;
  scope: "type" | "location";
}) {
  const [detail, setDetail] = useState<"location" | "type">(scope === "location" ? "location" : "type");

  const byType = PSI_TYPES.map((type) => {
    const d = metrics.byType[type];
    return { label: type, sublabel: "Jenis PSI", approved: d.approved, target: d.target, gap: Math.max(0, d.target - d.approved), pct: d.pct };
  });
  const byLocation = locations.map((loc) => {
    const approved = documents.filter((d) => d.location === loc.locationName && d.status === "Approved").length;
    const target = Object.values(loc.targets).reduce((s, t) => s + t, 0);
    const pct = target > 0 ? Math.min(100, Math.round((approved / target) * 100)) : 0;
    return { label: loc.locationName, sublabel: "Lokasi", approved, target, gap: Math.max(0, target - approved), pct };
  });
  const rows = (detail === "location" ? byLocation : byType).sort((a, b) => a.pct - b.pct);
  const totals = rows.reduce((acc, r) => ({ approved: acc.approved + r.approved, target: acc.target + r.target, gap: acc.gap + r.gap }), { approved: 0, target: 0, gap: 0 });
  const overallPct = totals.target > 0 ? Math.round((totals.approved / totals.target) * 100) : 0;

  return (
    <SectionCard
      title="Kepatuhan dokumen"
      action={
        isAdmin ? (
          <div className="segmented-control">
            <button className={detail === "location" ? "segmented-active" : ""} onClick={() => setDetail("location")}>Per lokasi</button>
            <button className={detail === "type" ? "segmented-active" : ""} onClick={() => setDetail("type")}>Per jenis PSI</button>
          </div>
        ) : undefined
      }
      className="span-7"
      state={rows.length > 0 ? "ready" : "empty"}
      emptyLabel="target kepatuhan dokumen"
    >
      <div className="compliance-summary">
        <div><span>Kepatuhan keseluruhan</span><strong>{overallPct}<small>%</small></strong></div>
        <div className="summary-divider" />
        <div><span>Approved / Target</span><strong className="mono-summary">{totals.approved} <small>/ {totals.target}</small></strong></div>
        <div className="summary-gap"><span>Kekurangan</span><strong>{totals.gap}</strong></div>
      </div>
      <div className="compliance-table-wrap">
        <table>
          <thead>
            <tr>
              <th>{detail === "location" ? "Lokasi" : "Jenis PSI"}</th>
              <th>Approved</th>
              <th>Target</th>
              <th>Kekurangan</th>
              <th>Kepatuhan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td><strong>{row.label}</strong><span>{row.sublabel}</span></td>
                <td className="mono">{row.approved}</td>
                <td className="mono">{row.target}</td>
                <td className={`mono ${row.gap > 0 ? "text-critical" : ""}`}>{row.gap > 0 ? row.gap : "—"}</td>
                <td>
                  <div className="table-progress"><span style={{ width: `${row.pct}%`, background: barColor(row.pct) }} /></div>
                  <b>{row.pct}%</b>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ------------------------------------------------------------------ composition

export default function PsiDashboardManus({
  insights,
  documents,
  complianceMetrics,
  locations,
  isAdmin,
  scope,
}: {
  insights: Insights;
  documents: DocumentItem[];
  complianceMetrics: ComplianceMetrics;
  locations: { locationName: string; targets: Record<string, number> }[];
  isAdmin: boolean;
  scope: "type" | "location";
}) {
  return (
    <div className="dashboard-content page-enter">
      <MetricGrid insights={insights} />
      <div className="content-grid content-grid-psi">
        <ExpiringList items={insights.expiring} />
        <StaleList items={insights.stale} />
        <RecentUpdates items={insights.recent} />
        <DistributionChart documents={documents} scope={scope} />
        <ComplianceTable metrics={complianceMetrics} documents={documents} locations={locations} isAdmin={isAdmin} scope={scope} />
      </div>
    </div>
  );
}
