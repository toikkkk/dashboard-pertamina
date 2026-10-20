"use client";

// Konten Dashboard MOC, porting DOM/kelas dari desain Manus — data dari
// mocInsights() (lib/domain/dashboard.ts), bukan data contoh.
import React, { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import Link from "next/link";
import { ChevronRight, Timer } from "lucide-react";
import { MOC_RISK_LEVEL_COLOR, MOC_RISK_LEVEL_LABEL, type MocRequest } from "@/lib/domain/moc";
import { MOC_STATE_META } from "@/lib/domain/statusStyle";
import { workingDaysBetween, type MocAttentionKind, type mocInsights } from "@/lib/domain/dashboard";
import SectionCard from "@/components/dashboard/SectionCard";
import { StatusDot, StatusPill, type Severity } from "@/components/dashboard/severity";

gsap.registerPlugin(Flip);

type Insights = ReturnType<typeof mocInsights>;

const KIND_SEVERITY: Record<MocAttentionKind, Severity> = { mine: "peringatan", sla: "kritis", temp: "peringatan", waiting: "revisi" };
const KIND_LABEL: Record<MocAttentionKind, string> = { mine: "Untuk Anda", sla: "Lewat batas waktu", temp: "Masa berlaku sementara", waiting: "Menunggu pihak lain" };
const STATE_SEVERITY: Record<string, Severity> = { draft: "peringatan", in_review: "peringatan", returned: "revisi", pending_approval: "peringatan", rejected: "kritis", approved: "peringatan", registered: "baik", halt_requested: "peringatan", halted: "revisi" };

const fmtWib = (s: string) => {
  const d = new Date(s.replace(" ", "T") + ":00+07:00");
  return isNaN(d.getTime()) ? s : d.toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
};

// ------------------------------------------------------------------ tahap

function StageRail({ stages, active, closed }: { stages: Insights["stageCounts"]; active: number; closed: number }) {
  const total = active + closed;
  const max = Math.max(...stages.map((s) => s.count), 1);
  return (
    <SectionCard title="Sebaran tahap MOC" action={<div className="stage-total"><strong>{total}</strong><span>total MOC</span></div>} className="span-12" state={total > 0 ? "ready" : "empty"} emptyLabel="MOC">
      <div className="moc-overview">
        <div className="moc-total"><span>Sedang berjalan</span><strong>{active}</strong></div>
        <div className="moc-total moc-total-complete"><span>Selesai</span><strong>{closed}</strong><small className="complete-note">tercatat</small></div>
        <div className="stage-rail">
          {stages.map((stage, index) => (
            <div className="stage-column" key={stage.label}>
              <div className="stage-count">{stage.count}</div>
              <div className="stage-track">
                <span
                  style={{ height: `${stage.count === 0 ? 4 : Math.max(12, (stage.count / max) * 100)}%` }}
                  className={stage.count === 0 ? "stage-empty" : index > 4 ? "stage-fill stage-fill-light" : "stage-fill"}
                />
              </div>
              <span className="stage-label">{stage.label}</span>
              <span className="stage-number">0{index + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

// ------------------------------------------------------------------ perlu perhatian

function AttentionList({ items, nowMs }: { items: Insights["attention"]; nowMs: number }) {
  const shown = items.slice(0, 7);
  return (
    <SectionCard title="Perlu perhatian" action={<span className="attention-count"><span>{items.length}</span> item{items.length > shown.length && <> · <Link href={items.some((i) => i.kind === "mine") ? "/moc?perlu=1" : "/moc"} className="card-action">Lihat semua</Link></>}</span>} className="span-7" state={shown.length > 0 ? "ready" : "empty"} emptyLabel="MOC yang perlu perhatian">
      <div className="attention-list">
        {shown.map(({ moc, kind, detail }, index) => {
          const since = moc.stateSince ? new Date(moc.stateSince).getTime() : 0;
          const days = since > 0 ? workingDaysBetween(since, nowMs) : 0;
          return (
            <Link className={`attention-row attention-${kind}`} key={moc.id + kind} href={`/moc/${moc.id}`}>
              <div className="attention-index">0{index + 1}</div>
              <StatusDot severity={KIND_SEVERITY[kind]} className="attention-dot" />
              <div className="row-main"><strong>{moc.judul || "(tanpa judul)"}</strong><span><span className="mono-number">{moc.mocNumber ?? "Belum bernomor"}</span> <i /> {moc.location}</span></div>
              <div className="attention-reason"><span>{KIND_LABEL[kind]}</span><small>{detail}</small></div>
              <div className="attention-duration" style={{ color: KIND_SEVERITY[kind] === "kritis" ? "#DC2626" : KIND_SEVERITY[kind] === "revisi" ? "#6D28D9" : "#B45309" }}>
                <Timer className="h-3.5 w-3.5" /> {days <= 0 ? "hari ini" : `${days} hari`}
              </div>
            </Link>
          );
        })}
      </div>
    </SectionCard>
  );
}

function RecentMocActivity({ items }: { items: MocRequest[] }) {
  return (
    <SectionCard title="Aktivitas terbaru" action={<Link href="/moc" className="card-action">Semua aktivitas <ChevronRight className="h-3.5 w-3.5" /></Link>} className="span-5" state={items.length > 0 ? "ready" : "empty"} emptyLabel="aktivitas MOC">
      <div className="activity-list">
        {items.map((m) => (
          <Link className="activity-row" key={m.id} href={`/moc/${m.id}`}>
            <div className="activity-marker"><StatusDot severity={STATE_SEVERITY[m.validationState] ?? "peringatan"} /></div>
            <div className="row-main"><strong>{m.judul || "(tanpa judul)"}</strong><span>{m.location} <i /> {fmtWib(m.updatedAt)}</span></div>
            <StatusPill severity={STATE_SEVERITY[m.validationState] ?? "peringatan"}>{MOC_STATE_META[m.validationState].label}</StatusPill>
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

// ------------------------------------------------------------------ baris bawah

const DONUT_COLOR = ["#0F3B59", "#60758A", "#AAB6BF"];

function BreakdownCard({ title, items, total, span, flipId }: { title: string; items: { label: string; count: number; color?: string }[]; total: number; span: string; flipId: string }) {
  let acc = 0;
  const stops = items
    .map((i, idx) => ({ ...i, color: i.color ?? DONUT_COLOR[idx % DONUT_COLOR.length] }))
    .filter((i) => i.count > 0)
    .map((i) => {
      const from = acc;
      acc += total > 0 ? (i.count / total) * 100 : 0;
      return `${i.color} ${from}% ${acc}%`;
    });
  return (
    <SectionCard title={title} className={`${span} moc-lower-card`} flipId={flipId} state={total > 0 ? "ready" : "empty"} emptyLabel={title.toLowerCase()}>
      <div className="donut-breakdown">
        <div className="donut" style={{ background: stops.length > 0 ? `conic-gradient(${stops.join(", ")})` : "#E9EEF0" }}>
          <div className="donut-hole"><strong>{total}</strong><span>berjalan</span></div>
        </div>
        <div className="breakdown-list">
          {items.map((item, index) => (
            <div key={item.label}>
              <span className={`breakdown-mark mark-${index}`} style={item.color ? { background: item.color } : undefined} />
              <span>{item.label}</span>
              <b>{item.count}</b>
              <small>{total > 0 ? Math.round((item.count / total) * 100) : 0}%</small>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function LocationMoc({ items }: { items: Insights["byLocation"] }) {
  return (
    <SectionCard title="MOC per lokasi" className="span-4 moc-lower-card" flipId="lokasi" state={items.length > 0 ? "ready" : "empty"} emptyLabel="MOC per lokasi">
      <div className="location-legend">
        <span><i className="legend-running" /> Berjalan</span>
        <span><i className="legend-complete" /> Selesai</span>
      </div>
      <div className="location-bars">
        {items.map((item) => {
          const total = Math.max(1, item.total);
          return (
            <div className="location-bar-row" key={item.location}>
              <span>{item.location}</span>
              <div className="location-track">
                <i className="location-running" style={{ width: `${(item.active / total) * 100}%` }} />
                <i className="location-complete" style={{ width: `${(item.closed / total) * 100}%` }} />
              </div>
              <strong>{item.total}</strong>
              <small>{item.active} / {item.closed}</small>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ------------------------------------------------------------------ composition

export default function MocDashboardManus({
  insights,
  nowMs,
  showLocations,
}: {
  insights: Insights;
  nowMs: number;
  showLocations: boolean;
}) {
  // Satu lokasi: dua kartu bawah masing-masing setengah lebar (simetris). Semua lokasi:
  // tiga kartu sepertiga. Perpindahan di antaranya dianimasikan dengan Flip (posisi dan
  // ukuran kartu bergeser mulus; kartu "MOC per lokasi" masuk dengan fade).
  const span = showLocations ? "span-4" : "span-6";
  const gridRef = useRef<HTMLDivElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);
  const prevShow = useRef(showLocations);

  useLayoutEffect(() => {
    const els = Array.from(gridRef.current?.querySelectorAll<HTMLElement>("[data-flip-id]") ?? []);
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (flipState.current && prevShow.current !== showLocations && !reduce && els.length > 0) {
      Flip.from(flipState.current, {
        targets: els,
        duration: 0.55,
        ease: "power3.inOut",
        absolute: false,
        onEnter: (entering) => gsap.fromTo(entering, { opacity: 0, y: 14, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "power2.out", delay: 0.1 }),
        onLeave: (leaving) => gsap.to(leaving, { opacity: 0, duration: 0.2 }),
      });
    }
    prevShow.current = showLocations;
    flipState.current = Flip.getState(els);
  });

  return (
    <div className="dashboard-content page-enter">
      <StageRail stages={insights.stageCounts} active={insights.active} closed={insights.closed} />
      <div className="content-grid content-grid-moc" ref={gridRef}>
        <AttentionList items={insights.attention} nowMs={nowMs} />
        <RecentMocActivity items={insights.recent} />
        <BreakdownCard
          title="Sifat perubahan"
          items={insights.bySifat.map((s) => ({ label: s.label, count: s.count }))}
          total={insights.active}
          span={span}
          flipId="sifat"
        />
        <BreakdownCard
          title="Tingkat risiko"
          items={insights.byRisk.map((r) => ({ label: MOC_RISK_LEVEL_LABEL[r.level], count: r.count, color: MOC_RISK_LEVEL_COLOR[r.level] }))}
          total={insights.active}
          span={span}
          flipId="risiko"
        />
        {showLocations && <LocationMoc items={insights.byLocation} />}
      </div>
    </div>
  );
}
