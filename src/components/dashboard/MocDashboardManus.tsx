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

// ------------------------------------------------------------------ ringkasan + tahap

function StatTile({ label, value, tone, hint }: { label: string; value: number; tone: "biru" | "amber" | "merah" | "ungu" | "hijau"; hint: string }) {
  return (
    <div className={`mdb-stat mdb-${tone}${value === 0 ? " mdb-zero" : ""}`}>
      <strong>{value}</strong>
      <span>{label}</span>
      <small>{hint}</small>
    </div>
  );
}

function StageRail({ insights }: { insights: Insights }) {
  const { stageCounts: stages, active, closed, running, halted, mineCount, slaCount } = insights;
  const total = active + closed;
  const max = Math.max(...stages.map((s) => s.count), 1);
  const last = stages.length - 1;
  return (
    <SectionCard title="Ringkasan MOC" action={<div className="stage-total"><strong>{total}</strong><span>total MOC</span></div>} className="span-12" state={total > 0 ? "ready" : "empty"} emptyLabel="MOC">
      <div className="mdb-stats">
        <StatTile label="Sedang berjalan" value={running} tone="biru" hint="sedang diproses" />
        <StatTile label="Menunggu Anda" value={mineCount} tone="amber" hint="perlu tindakan Anda" />
        <StatTile label="Lewat batas waktu" value={slaCount} tone="merah" hint="melebihi batas hari kerja" />
        <StatTile label="Ditunda / dihentikan" value={halted} tone="ungu" hint="menunggu dilanjutkan" />
        <StatTile label="Selesai" value={closed} tone="hijau" hint="sudah ditutup" />
      </div>
      <div className="mdb-pipeline-head">Posisi MOC per tahap</div>
      <div className="mdb-pipeline" role="list">
        {stages.map((stage, index) => {
          const h = stage.count === 0 ? 0 : Math.max(14, (stage.count / max) * 100);
          return (
            <div className="mdb-stage" role="listitem" key={stage.label} title={`${stage.count} MOC di tahap ${stage.label}`}>
              <div className={`mdb-stage-count${stage.count === 0 ? " mdb-zero" : ""}`}>{stage.count}</div>
              <div className="mdb-stage-track">
                <span className={index === last ? "mdb-fill-done" : "mdb-fill"} style={{ height: `${h}%` }} />
              </div>
              <div className="mdb-stage-label">{stage.label}</div>
              <div className="mdb-stage-no">Tahap {index + 1}</div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ------------------------------------------------------------------ perlu perhatian

const KIND_COLOR: Record<MocAttentionKind, string> = { mine: "#B45309", sla: "#DC2626", temp: "#92400E", waiting: "#6D28D9" };

function AttentionList({ items, nowMs }: { items: Insights["attention"]; nowMs: number }) {
  const shown = items.slice(0, 7);
  const counts = (["mine", "sla", "temp", "waiting"] as MocAttentionKind[]).map((k) => ({ k, n: items.filter((i) => i.kind === k).length })).filter((c) => c.n > 0);
  return (
    <SectionCard title="Perlu perhatian" action={<span className="attention-count"><span>{items.length}</span> item{items.length > shown.length && <> · <Link href={items.some((i) => i.kind === "mine") ? "/moc?perlu=1" : "/moc"} className="card-action">Lihat semua</Link></>}</span>} className="span-7" state={shown.length > 0 ? "ready" : "empty"} emptyLabel="MOC yang perlu perhatian">
      <div className="mdb-attn-chips">
        {counts.map(({ k, n }) => (
          <span key={k} className="mdb-chip" style={{ color: KIND_COLOR[k], borderColor: KIND_COLOR[k] }}><b>{n}</b> {KIND_LABEL[k]}</span>
        ))}
      </div>
      <div className="mdb-attn-list">
        {shown.map(({ moc, kind, detail }) => {
          const since = moc.stateSince ? new Date(moc.stateSince).getTime() : 0;
          const days = since > 0 ? workingDaysBetween(since, nowMs) : 0;
          return (
            <Link className="mdb-attn-row" key={moc.id + kind} href={`/moc/${moc.id}`} style={{ borderLeftColor: KIND_COLOR[kind] }}>
              <div className="mdb-attn-main">
                <strong>{moc.judul || "(tanpa judul)"}</strong>
                <span><span className="mono-number">{moc.mocNumber ?? "Belum bernomor"}</span> · {moc.location}</span>
              </div>
              <div className="mdb-attn-why">
                <b style={{ color: KIND_COLOR[kind] }}>{KIND_LABEL[kind]}</b>
                <span>{detail}</span>
              </div>
              <div className="mdb-attn-days">{days <= 0 ? "baru hari ini" : <>menunggu <b>{days}</b> hari</>}</div>
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

const BAR_COLOR = ["#0F3B59", "#60758A", "#AAB6BF"];

// Daftar batang berlabel (menggantikan donat): satu baris per kategori, panjang batang = porsi dari `total`.
function BarBreakdown({ title, note, items, total, extra, span, flipId }: { title: string; note: string; items: { label: string; count: number; color?: string }[]; total: number; extra?: { label: string; count: number }; span: string; flipId: string }) {
  const hasData = total > 0 || (extra?.count ?? 0) > 0;
  return (
    <SectionCard title={title} action={<span className="mdb-total-note">{note}</span>} className={`${span} moc-lower-card`} flipId={flipId} state={hasData ? "ready" : "empty"} emptyLabel={title.toLowerCase()}>
      <div className="mdb-bars">
        {items.map((item, idx) => {
          const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
          return (
            <div className={`mdb-bar-row${item.count === 0 ? " mdb-zero" : ""}`} key={item.label}>
              <span className="mdb-bar-label">{item.label}</span>
              <div className="mdb-bar-track"><i style={{ width: `${item.count === 0 ? 0 : Math.max(4, pct)}%`, background: item.color ?? BAR_COLOR[idx % BAR_COLOR.length] }} /></div>
              <span className="mdb-bar-val"><b>{item.count}</b> MOC{item.count > 0 && <small> · {pct}%</small>}</span>
            </div>
          );
        })}
        {extra && extra.count > 0 && (
          <div className="mdb-bar-row mdb-bar-extra">
            <span className="mdb-bar-label">{extra.label}</span>
            <div className="mdb-bar-track" />
            <span className="mdb-bar-val"><b>{extra.count}</b> MOC</span>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function LocationMoc({ items }: { items: Insights["byLocation"] }) {
  const rows = [...items].sort((a, b) => b.total - a.total || a.location.localeCompare(b.location));
  const max = Math.max(...rows.map((r) => r.total), 1);
  return (
    <SectionCard title="MOC per lokasi" className="span-4 moc-lower-card" flipId="lokasi" state={items.length > 0 ? "ready" : "empty"} emptyLabel="MOC per lokasi">
      <div className="mdb-loc-legend">
        <span><i style={{ background: "#0F3B59" }} /> Berjalan</span>
        <span><i style={{ background: "#15803D" }} /> Selesai</span>
      </div>
      <div className="mdb-bars">
        {rows.map((item) => (
          <div className="mdb-loc-row" key={item.location}>
            <span className="mdb-bar-label">{item.location}</span>
            <div className="mdb-bar-track">
              <i style={{ width: `${(item.active / max) * 100}%`, background: "#0F3B59" }} />
              <i style={{ width: `${(item.closed / max) * 100}%`, background: "#15803D" }} />
            </div>
            <span className="mdb-bar-val"><b>{item.active}</b> berjalan · <b>{item.closed}</b> selesai</span>
          </div>
        ))}
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
      <StageRail insights={insights} />
      <div className="content-grid content-grid-moc" ref={gridRef}>
        <AttentionList items={insights.attention} nowMs={nowMs} />
        <RecentMocActivity items={insights.recent} />
        <BarBreakdown
          title="Sifat perubahan"
          note={`${insights.active} MOC belum selesai`}
          items={insights.bySifat.map((x) => ({ label: x.label, count: x.count }))}
          total={insights.active}
          span={span}
          flipId="sifat"
        />
        <BarBreakdown
          title="Tingkat risiko"
          note={`${insights.active - insights.unrated} MOC sudah dinilai`}
          items={insights.byRisk.map((r) => ({ label: MOC_RISK_LEVEL_LABEL[r.level], count: r.count, color: MOC_RISK_LEVEL_COLOR[r.level] }))}
          total={insights.active - insights.unrated}
          extra={{ label: "Belum dinilai", count: insights.unrated }}
          span={span}
          flipId="risiko"
        />
        {showLocations && <LocationMoc items={insights.byLocation} />}
      </div>
    </div>
  );
}
