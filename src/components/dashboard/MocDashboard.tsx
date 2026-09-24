"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Panel, { EmptyLine } from "@/components/dashboard/Panel";
import StatusTag from "@/components/StatusTag";
import { MOC_STATE_META } from "@/lib/domain/statusStyle";
import { MOC_RISK_LEVEL_LABEL, MOC_STAGES, type MocRequest } from "@/lib/domain/moc";
import type { MocAttentionKind, mocInsights } from "@/lib/domain/dashboard";
import { useCountUp } from "@/lib/useCountUp";

type Insights = ReturnType<typeof mocInsights>;

const KIND: Record<MocAttentionKind, { label: string; color: string }> = {
  mine: { label: "Untuk Anda", color: "#0F3B59" },
  sla: { label: "Lewat batas waktu", color: "#DC2626" },
  temp: { label: "Masa berlaku sementara", color: "#B45309" },
  waiting: { label: "Menunggu perbaikan", color: "#6D28D9" },
};
const RISK_COLOR = { H: "#DC2626", M: "#B45309", L: "#15803D" } as const;

// updatedAt dari server berformat "YYYY-MM-DD HH:mm" (WIB).
const fmtWib = (s: string) => {
  const d = new Date(s.replace(" ", "T") + ":00+07:00");
  return isNaN(d.getTime()) ? s : d.toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
};

// Bilah tumbuh dari kiri setelah tampil (transform saja, murah untuk digambar).
function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setM(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return m;
}

function StageCell({ label, count, max, index, last }: { label: string; count: number; max: number; index: number; last: boolean }) {
  const animated = useCountUp(count, 600);
  const mounted = useMounted();
  const share = max > 0 ? count / max : 0;
  return (
    <div className="bg-white px-3.5 py-3.5">
      <div className="text-[10.5px] font-bold uppercase tracking-[.05em] text-[#3a3d40] leading-tight min-h-[26px]">
        <span className="font-mono text-[#6b6e72] mr-1">{index + 1}</span>
        {label}
      </div>
      <div className="font-heading text-[26px] font-bold leading-none mt-2" style={{ color: count === 0 ? "#6b6e72" : last ? "#15803D" : "#0F3B59" }}>
        {animated}
      </div>
      <div className="h-[3px] bg-[#eceded] rounded-full overflow-hidden mt-3">
        <div
          className="h-full origin-left transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)]"
          style={{ background: last ? "#15803D" : "#0F3B59", width: "100%", transform: `scaleX(${mounted ? share : 0})`, transitionDelay: `${index * 40}ms` }}
        />
      </div>
    </div>
  );
}

function Pipeline({ data }: { data: Insights }) {
  const max = Math.max(1, ...data.stageCounts.map((s) => s.count));
  return (
    <section className="bg-white border border-[#C5CED3] rounded-[8px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_6px_rgba(15,23,42,.04)] overflow-hidden mb-3.5">
      <div className="flex items-baseline justify-between gap-3 px-4 lg:px-5 pt-4 pb-3">
        <h3 className="text-[13px] font-bold text-[#0F172A]">MOC per Tahap</h3>
        <span className="text-[11px] font-semibold text-[#3a3d40]">{data.active} berjalan · {data.closed} selesai</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-px bg-[#eceded] border-t border-[#C5CED3]">
        {data.stageCounts.map((s, i) => (
          <StageCell key={s.label} label={s.label} count={s.count} max={max} index={i} last={i === MOC_STAGES.length - 1} />
        ))}
      </div>
    </section>
  );
}

function Attention({ items }: { items: Insights["attention"] }) {
  const shown = items.slice(0, 7);
  return (
    <Panel title="Perlu Perhatian" right={items.length > 0 ? `${items.length} MOC` : undefined}>
      {shown.length > 0 ? (
        <ul className="flex flex-col divide-y divide-[#eef0f2]">
          {shown.map(({ moc, kind, detail }) => (
            <li key={moc.id + kind}>
              <Link href={`/moc/${moc.id}`} className="block py-2.5 -mx-2 px-2 rounded-[8px] transition-colors duration-200 hover:bg-[#f6f8f9] group">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[12.5px] font-semibold text-[#0F172A] group-hover:text-[#0F3B59] truncate transition-colors">{moc.judul || "(tanpa judul)"}</span>
                  <span className="font-mono text-[11px] text-[#3a3d40] flex-shrink-0">{moc.mocNumber ?? "Belum bernomor"}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11.5px] text-[#3a3d40] min-w-0">
                  <StatusTag color={KIND[kind].color} label={KIND[kind].label} size="sm" />
                  <span className="truncate">{detail} · {moc.location}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyLine>Tidak ada MOC yang perlu perhatian.</EmptyLine>
      )}
      {items.length > shown.length && (
        <Link href="/moc" className="inline-block mt-2 text-[12px] font-bold text-[#0F3B59] hover:underline">
          Lihat {items.length - shown.length} lainnya di Register MOC
        </Link>
      )}
    </Panel>
  );
}

function Recent({ items }: { items: MocRequest[] }) {
  return (
    <Panel title="Aktivitas Terbaru">
      {items.length > 0 ? (
        <ul className="flex flex-col divide-y divide-[#eef0f2]">
          {items.map((m) => (
            <li key={m.id}>
              <Link href={`/moc/${m.id}`} className="flex items-center gap-3 py-2.5 -mx-2 px-2 rounded-[8px] transition-colors duration-200 hover:bg-[#f6f8f9] group">
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold text-[#0F172A] group-hover:text-[#0F3B59] truncate transition-colors">{m.judul || "(tanpa judul)"}</div>
                  <div className="text-[11px] text-[#3a3d40] mt-0.5 truncate">{m.location} · {fmtWib(m.updatedAt)}</div>
                </div>
                <StatusTag color={MOC_STATE_META[m.validationState].color} label={MOC_STATE_META[m.validationState].label} size="sm" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyLine>Belum ada MOC.</EmptyLine>
      )}
    </Panel>
  );
}

function Ledger({ title, rows }: { title: string; rows: { key: string; label: string; count: number; color: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const mounted = useMounted();
  return (
    <Panel title={title} right="MOC berjalan">
      <ul className="flex flex-col divide-y divide-[#eef0f2]">
        {rows.map((r, i) => (
          <li key={r.key} className="flex items-center gap-3 py-2.5">
            <span className="text-[12.5px] font-semibold text-[#3a3d40] w-[92px] flex-shrink-0">{r.label}</span>
            <div className="flex-1 h-[8px] rounded-full bg-[#eceded] overflow-hidden min-w-0">
              <div
                className="h-full rounded-full origin-left transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)]"
                style={{ background: r.color, width: "100%", transform: `scaleX(${mounted ? r.count / max : 0})`, transitionDelay: `${i * 60}ms` }}
              />
            </div>
            <span className="font-mono text-[12px] font-semibold text-[#0F172A] tabular-nums w-[22px] text-right flex-shrink-0">{r.count}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function ByLocation({ rows }: { rows: Insights["byLocation"] }) {
  const mounted = useMounted();
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <Panel title="MOC per Lokasi" right={`${rows.length} lokasi`}>
      {rows.length > 0 ? (
        <ul className="flex flex-col divide-y divide-[#eef0f2]">
          {rows.map((r, i) => (
            <li key={r.location} className="flex items-center gap-3 py-2.5">
              <span className="text-[12.5px] font-semibold text-[#3a3d40] w-[110px] sm:w-[150px] flex-shrink-0 truncate">{r.location}</span>
              <div className="flex-1 h-[8px] rounded-full bg-[#eceded] overflow-hidden min-w-0">
                <div
                  className="h-full flex origin-left transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)]"
                  style={{ width: "100%", transform: `scaleX(${mounted ? r.total / max : 0})`, transitionDelay: `${i * 60}ms` }}
                >
                  <div style={{ width: `${(r.active / Math.max(1, r.total)) * 100}%`, background: "#0F3B59" }} title={`${r.active} berjalan`} />
                  <div style={{ width: `${(r.closed / Math.max(1, r.total)) * 100}%`, background: "#15803D" }} title={`${r.closed} selesai`} />
                </div>
              </div>
              <span className="text-[11.5px] text-[#3a3d40] tabular-nums w-[110px] text-right flex-shrink-0 hidden sm:block">
                <span className="font-mono font-semibold text-[#0F172A]">{r.active}</span> berjalan · <span className="font-mono font-semibold text-[#0F172A]">{r.closed}</span> selesai
              </span>
              <span className="font-mono text-[12px] font-semibold text-[#0F172A] tabular-nums w-[22px] text-right flex-shrink-0 sm:hidden">{r.total}</span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyLine>Belum ada MOC di lokasi mana pun.</EmptyLine>
      )}
    </Panel>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Memuat dashboard MOC">
      <div className="h-[128px] bg-white/70 border border-[#C5CED3] rounded-[8px] mb-3.5" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3.5 mb-3.5 items-start">
        <div className="lg:col-span-3 h-[260px] bg-white/70 border border-[#C5CED3] rounded-[8px]" />
        <div className="lg:col-span-2 h-[260px] bg-white/70 border border-[#C5CED3] rounded-[8px]" />
      </div>
    </div>
  );
}

export default function MocDashboard({
  data,
  state,
  onRetry,
  showLocations,
}: {
  data: Insights;
  state: "loading" | "error" | "ready";
  onRetry: () => void;
  showLocations: boolean;
}) {
  if (state === "loading") return <Skeleton />;
  if (state === "error") {
    return (
      <div role="alert" className="bg-white border border-[#C5CED3] rounded-[8px] p-6 text-[13px] text-[#0F172A]">
        Data MOC belum bisa dimuat.{" "}
        <button type="button" onClick={onRetry} className="font-bold text-[#0F3B59] hover:underline">Coba lagi</button>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <Pipeline data={data} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3.5 mb-3.5">
        <div className="lg:col-span-3"><Attention items={data.attention} /></div>
        <div className="lg:col-span-2"><Recent items={data.recent} /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5 items-start">
        <Ledger
          title="Sifat Perubahan"
          rows={data.bySifat.map((r) => ({ key: r.label, label: r.label, count: r.count, color: r.label === "Darurat" ? "#DC2626" : r.label === "Sementara" ? "#B45309" : "#0F3B59" }))}
        />
        <Ledger
          title="Tingkat Risiko"
          rows={data.byRisk.map((r) => ({ key: r.level, label: MOC_RISK_LEVEL_LABEL[r.level], count: r.count, color: RISK_COLOR[r.level] }))}
        />
      </div>

      {showLocations && <ByLocation rows={data.byLocation} />}
    </div>
  );
}
