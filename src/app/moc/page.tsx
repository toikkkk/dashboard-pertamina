"use client";

import MenuSelect from "@/components/ui/MenuSelect";
import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Plus, Download } from "lucide-react";
import { usePsi } from "@/lib/psiStore";
import { useMocActor, useMocList } from "@/lib/useMoc";
import {
  MOC_ACTION_LABEL,
  MOC_INITIATOR_ROLE,
  MOC_REGISTER_STATUSES,
  mocActionsFor,
  mocPendingActions,
  mocRolesOf,
  type MocRequest,
} from "@/lib/domain/moc";
import { MOC_STATE_META } from "@/lib/domain/statusStyle";
import StatusTag from "@/components/StatusTag";
import { mocInsights } from "@/lib/domain/dashboard";
import { exportMocRegisterXlsx } from "@/lib/exportMocRegister";

const CARD =
  "bg-white border border-[#D8E1E4] rounded-[12px] shadow-[0_2px_6px_rgba(15,23,42,.045)]";
const SELECT = "text-[13px] px-2.5 py-1.5 border border-[#C5CED3] rounded-[8px] bg-white font-semibold";

function fmtDate(ts?: string | null) {
  if (!ts) return "—";
  const d = new Date(ts.replace(" ", "T"));
  return isNaN(d.getTime()) ? ts : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

const clip = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s || "—");

interface Row {
  moc: MocRequest;
  needs: string[]; // label tindakan yang menunggu user
  roles: string[];
  canAdvance: boolean;
}


// Ringkasan di atas Register: total, jumlah per tahap, dan hal yang perlu perhatian. Setiap angka bisa diklik dan
// memfilter daftar di bawahnya; jumlah pada kartu sama dengan jumlah baris hasil filter.
function RegisterSummary({
  mocs,
  needCount,
  attention,
  status,
  mineOnly,
  perhatian,
  setParams,
}: {
  mocs: MocRequest[];
  needCount: number;
  attention: { sla: number; temp: number; waiting: number };
  status: string;
  mineOnly: boolean;
  perhatian: string | null;
  setParams: (patch: Record<string, string | null>) => void;
}) {
  const running = mocs.filter((m) => m.registerStatus !== "Closed").length;
  const byStatus = MOC_REGISTER_STATUSES.map((s) => ({ s, n: mocs.filter((m) => m.registerStatus === s).length }));
  const max = Math.max(1, ...byStatus.map((x) => x.n));
  const noFilter = status === "ALL" && !mineOnly && !perhatian;
  const clear = { status: null, perlu: null, perhatian: null };
  const attentionRows: { label: string; n: number; color: string; active: boolean; patch: Record<string, string | null> }[] = [
    { label: "Perlu tindakan Anda", n: needCount, color: "#B45309", active: mineOnly, patch: { ...clear, perlu: "1" } },
    { label: "Lewat batas waktu", n: attention.sla, color: "#DC2626", active: perhatian === "sla", patch: { ...clear, perhatian: "sla" } },
    { label: "Masa berlaku sementara", n: attention.temp, color: "#B45309", active: perhatian === "temp", patch: { ...clear, perhatian: "temp" } },
    { label: "Menunggu pihak lain", n: attention.waiting, color: "#6D28D9", active: perhatian === "waiting", patch: { ...clear, perhatian: "waiting" } },
  ];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
      <button
        type="button"
        onClick={() => setParams(clear)}
        aria-pressed={noFilter}
        className={`${CARD} text-left p-4 transition-colors hover:border-[#0F3B59] ${noFilter ? "!border-[#0F3B59]" : ""}`}
      >
        <div className="text-[11px] font-bold uppercase tracking-[.05em] text-[#6b6e72]">Total MOC</div>
        <div className="font-heading text-[40px] font-bold leading-none text-[#0F172A] mt-2">{mocs.length}</div>
        <div className="text-[12px] text-[#6b6e72] mt-2.5">{running} berjalan · {mocs.length - running} selesai</div>
      </button>

      <div className={`${CARD} p-4`}>
        <div className="text-[11px] font-bold uppercase tracking-[.05em] text-[#6b6e72] mb-2">Per tahap</div>
        <div className="flex flex-col gap-1">
          {byStatus.map(({ s, n }) => (
            <button
              key={s}
              type="button"
              disabled={n === 0}
              onClick={() => setParams({ ...clear, status: status === s ? null : s })}
              aria-pressed={status === s}
              className={`grid items-center gap-2.5 rounded-[8px] px-2 py-1 text-left transition-colors ${status === s ? "bg-[#E2E8EB]" : "hover:bg-[#F3F6F8]"} disabled:opacity-60 disabled:hover:bg-transparent`}
              style={{ gridTemplateColumns: "118px minmax(0,1fr) 28px" }}
            >
              <span className="text-[12px] text-[#3a3d40] truncate">{s}</span>
              <span className="h-[8px] rounded-[4px] bg-[#ECEDED] overflow-hidden"><i className="block h-full rounded-[4px] bg-[#0F3B59]" style={{ width: `${(n / max) * 100}%` }} /></span>
              <b className="font-mono text-[12px] text-[#0F172A] text-right">{n}</b>
            </button>
          ))}
        </div>
      </div>

      <div className={`${CARD} p-4`}>
        <div className="text-[11px] font-bold uppercase tracking-[.05em] text-[#6b6e72] mb-2">Perlu perhatian</div>
        <div className="flex flex-col gap-1">
          {attentionRows.map((r) => (
            <button
              key={r.label}
              type="button"
              disabled={r.n === 0}
              onClick={() => setParams(r.active ? clear : r.patch)}
              aria-pressed={r.active}
              className={`flex items-center justify-between gap-3 rounded-[8px] px-2 py-1.5 text-left transition-colors ${r.active ? "bg-[#E2E8EB]" : "hover:bg-[#F3F6F8]"} disabled:opacity-60 disabled:hover:bg-transparent`}
            >
              <span className="inline-flex items-center gap-2 text-[12.5px] text-[#3a3d40]"><i className="inline-block w-2 h-2 rounded-full" style={{ background: r.color }} />{r.label}</span>
              <b className="font-mono text-[13px]" style={{ color: r.n > 0 ? r.color : "#9a9da0" }}>{r.n}</b>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MocRegisterContent() {
  const { activeUser } = usePsi();
  const actor = useMocActor();
  const router = useRouter();
  const { mocs, isLoading, error } = useMocList();
  const [search, setSearch] = useState("");
  // Filter disimpan di alamat halaman (?status=&perlu=&perhatian=&lokasi=) supaya angka di ringkasan dashboard dan
  // ringkasan Register bisa menaut ke daftar yang sudah terfilter.
  const sp = useSearchParams();
  const statusRaw = sp.get("status");
  const status = statusRaw && (MOC_REGISTER_STATUSES as readonly string[]).includes(statusRaw) ? statusRaw : "ALL";
  const mineOnly = sp.get("perlu") === "1";
  const perhatianRaw = sp.get("perhatian");
  const perhatian = (["sla", "temp", "waiting"] as const).find((k) => k === perhatianRaw) ?? null;
  const lokasiParam = sp.get("lokasi");
  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.replace(qs ? `/moc?${qs}` : "/moc", { scroll: false });
  };

  const isAdmin = !!activeUser.isRegionalAdmin;
  const canCreate = !isAdmin && !!activeUser.location && activeUser.role === MOC_INITIATOR_ROLE;
  // Admin Regional & mode "Semua lokasi": hanya-lihat. Non-admin default ke lokasi sendiri.
  // Non-admin: tanpa ?lokasi = lokasi sendiri; ?lokasi=ALL atau nama lokasi = lihat lokasi lain (hanya lihat).
  const scopeAll = !isAdmin && !!lokasiParam;
  const showAll = isAdmin || scopeAll;
  const scopeLocation = showAll && lokasiParam && lokasiParam !== "ALL" ? lokasiParam : null;

  const scopedMocs = useMemo(
    () => mocs.filter((m) => (showAll ? (scopeLocation ? m.location === scopeLocation : true) : m.location === activeUser.location)),
    [mocs, showAll, scopeLocation, activeUser.location]
  );
  const insights = useMemo(() => mocInsights(scopedMocs, actor, Date.now()), [scopedMocs, actor]);
  const attentionIds = useMemo(() => {
    const ids: Record<"sla" | "temp" | "waiting", Set<string>> = { sla: new Set(), temp: new Set(), waiting: new Set() };
    for (const a of insights.attention) if (a.kind !== "mine") ids[a.kind].add(a.moc.id);
    return ids;
  }, [insights]);
  const needCount = scopedMocs.filter((m) => mocPendingActions(m, actor).length > 0).length;
  const locationOptions = useMemo(() => Array.from(new Set(mocs.map((m) => m.location))).sort(), [mocs]);

  const rows: Row[] = scopedMocs
    .filter((m) => status === "ALL" || m.registerStatus === status)
    .filter((m) => !perhatian || attentionIds[perhatian].has(m.id))
    .filter((m) => {
      const q = search.trim().toLowerCase();
      return !q || m.judul.toLowerCase().includes(q) || (m.mocNumber ?? "").toLowerCase().includes(q);
    })
    .map((m) => ({
      moc: m,
      needs: mocPendingActions(m, actor).map((a) =>
        a === "submit" && (m.validationState === "returned" || m.validationState === "rejected") ? "Ajukan ulang" : MOC_ACTION_LABEL[a]
      ),
      roles: mocRolesOf(m, actor),
      canAdvance: mocActionsFor(m, actor).includes("advance"),
    }));

  const groups: { key: string; title: string; rows: Row[] }[] = [
    { key: "need", title: "Perlu tindakan Anda", rows: rows.filter((r) => r.needs.length > 0) },
    {
      key: "run",
      title: "Sedang berjalan",
     
      rows: rows.filter((r) => r.needs.length === 0 && r.moc.registerStatus !== "Closed"),
    },
    { key: "done", title: "Selesai (Closed)", rows: rows.filter((r) => r.needs.length === 0 && r.moc.registerStatus === "Closed") },
  ].filter((g) => (mineOnly ? g.key === "need" : true) && g.rows.length > 0);

  const go = (id: string) => router.push(`/moc/${id}`);

  const StateTag = ({ m }: { m: MocRequest }) => {
    const meta = MOC_STATE_META[m.validationState];
    return <StatusTag color={meta.color} label={meta.label} size="sm" />;
  };
  const ForYou = ({ r }: { r: Row }) =>
    r.needs.length > 0 ? (
      <span className="inline-block text-[11px] font-bold px-2 py-[3px] rounded-full bg-[#FEF3C7] text-[#92400E]">{r.needs.join(" · ")}</span>
    ) : r.moc.registerStatus === "Closed" ? (
      <span className="text-[11.5px] font-semibold text-[#15803D]">Selesai</span>
    ) : r.canAdvance ? (
      <span className="text-[11.5px] text-[#6b6e72]">Bisa memajukan tahap</span>
    ) : r.roles.length > 0 ? (
      <span className="text-[11.5px] text-[#6b6e72]">Menunggu pihak lain</span>
    ) : (
      <span className="text-[11.5px] text-[#9a9da0]">Hanya lihat</span>
    );

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 className="font-heading text-[18px] font-bold text-[#0F172A]">Register MOC</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            disabled={rows.length === 0}
            onClick={() => exportMocRegisterXlsx(rows.map((r) => r.moc), scopeLocation ?? (showAll ? "Semua-lokasi" : activeUser.location ?? "MOC"))}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#C5CED3] bg-white text-[#0F3B59] hover:bg-[#E2E8EB] text-[13px] font-bold transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" strokeWidth={2.2} /> Ekspor Register
          </button>
        {(activeUser.isRegionalAdmin || (activeUser.role.includes("Controller") && !!activeUser.location)) && (
          <Link
            href="/moc/offline"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#C5CED3] bg-white text-[#0F3B59] hover:bg-[#E2E8EB] text-[13px] font-bold transition-colors"
          >
            Catat MOC Offline
          </Link>
        )}
        {canCreate && (
          <Link
            href="/moc/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0F3B59] hover:bg-[#0B2C43] text-white text-[13px] font-bold transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={2.2} /> MOC Baru
          </Link>
        )}
        </div>
      </div>

      <RegisterSummary
        mocs={scopedMocs}
        needCount={needCount}
        attention={{ sla: attentionIds.sla.size, temp: attentionIds.temp.size, waiting: attentionIds.waiting.size }}
        status={status}
        mineOnly={mineOnly}
        perhatian={perhatian}
        setParams={setParams}
      />

      <div className="flex gap-2.5 mb-4 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-[#9a9da0] absolute left-[11px] top-1/2 -translate-y-1/2" strokeWidth={1.8} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul atau nomor MOC..."
            className="w-full min-h-[38px] pl-[34px] pr-3 py-1.5 text-[13px] border border-[#C5CED3] rounded-[8px]"
          />
        </div>
        <MenuSelect
          ariaLabel="Status perubahan"
          minWidth={180}
          value={status}
          options={[{ value: "ALL", label: "Semua Status" }, ...MOC_REGISTER_STATUSES.map((st) => ({ value: st, label: st }))]}
          onChange={(v) => setParams({ status: v === "ALL" ? null : v, perhatian: null })}
        />
        {!isAdmin && !!activeUser.location && (
          <MenuSelect
            ariaLabel="Cakupan lokasi"
            minWidth={230}
            value={scopeAll ? "ALL" : "OWN"}
            options={[
              { value: "OWN", label: `Lokasi saya (${activeUser.location})` },
              { value: "ALL", label: "Semua lokasi (lihat saja)" },
            ]}
            onChange={(v) => setParams({ lokasi: v === "ALL" ? "ALL" : null })}
          />
        )}
        {showAll && (
          <MenuSelect
            ariaLabel="Lokasi MOC"
            minWidth={200}
            value={scopeLocation ?? "ALL"}
            options={[{ value: "ALL", label: "Semua lokasi" }, ...locationOptions.map((l) => ({ value: l, label: l }))]}
            onChange={(v) => setParams({ lokasi: v === "ALL" ? (isAdmin ? null : "ALL") : v })}
          />
        )}
        <label className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#0F172A] cursor-pointer">
          <input type="checkbox" checked={mineOnly} onChange={(e) => setParams({ perlu: e.target.checked ? "1" : null, perhatian: null })} />
          Hanya yang perlu tindakan saya
        </label>
      </div>

      {error ? (
        <div className={`${CARD} py-10 px-5 text-center text-[13px] text-[#DC2626]`}>Gagal memuat daftar MOC. Coba muat ulang halaman.</div>
      ) : isLoading ? (
        <div className={`${CARD} py-10 px-5 text-center text-[13px] text-[#6b6e72]`}>Memuat…</div>
      ) : groups.length === 0 ? (
        <div className={`${CARD} py-12 px-5 text-center text-[13px] text-[#9a9da0]`}>
          {mineOnly ? "Tidak ada MOC yang menunggu tindakan Anda." : "Belum ada MOC yang sesuai."}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((g) => (
            <section key={g.key} aria-label={g.title}>
              <div className="flex items-baseline gap-2.5 mb-2 flex-wrap">
                <h2 className="text-[13.5px] font-bold text-[#0F172A]">{g.title}</h2>
                <span
                  className="text-[11px] font-bold px-2 py-[1px] rounded-full"
                  style={{ background: g.key === "need" ? "#B45309" : "#C5CED3", color: g.key === "need" ? "#fff" : "#0F172A" }}
                >
                  {g.rows.length}
                </span>
              </div>

              <div className={`${CARD} overflow-hidden`} style={g.key === "need" ? { borderColor: "#B45309" } : undefined}>
                <div className="lg:hidden divide-y divide-[#f0f0f1]">
                  {g.rows.map(({ moc: m, ...r }) => (
                    <Link key={m.id} href={`/moc/${m.id}`} className="block p-3.5 hover:bg-[#E2E8EB]/50 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-mono text-[11px] text-[#9a9da0]">{m.mocNumber ?? "Belum bernomor"}{m.isOffline ? " · Offline" : ""}</span>
                        <StateTag m={m} />
                      </div>
                      <div className="font-semibold text-[13.5px] text-[#0F172A] mb-1">{m.judul || "(tanpa judul)"}</div>
                      <div className="text-[12px] text-[#6b6e72] mb-1.5">{m.location} · {m.sifatPerubahan} · {m.registerStatus}</div>
                      <ForYou r={{ moc: m, ...r }} />
                    </Link>
                  ))}
                </div>

                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-[12.5px]">
                    <thead>
                      <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-[#6b6e72] border-b border-[#C5CED3] bg-[#E2E8EB]">
                        {["No MOC", "Lokasi", "Sifat", "Anggaran", "Judul Perubahan", "Tgl. Disetujui", "Status", "Untuk Anda"].map((h) => (
                          <th key={h} className="px-3 py-2.5 font-bold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((row) => {
                        const m = row.moc;
                        return (
                          <tr
                            key={m.id}
                            onClick={(e) => { if (!(e.target as HTMLElement).closest("a")) go(m.id); }}
                            className="border-b border-[#f0f0f1] last:border-0 hover:bg-[#E2E8EB]/60 transition-colors align-top cursor-pointer"
                          >
                            <td className="px-3 py-3 font-mono text-[11.5px] text-[#3a3d40] whitespace-nowrap">{m.mocNumber ?? "—"}{m.isOffline && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-[1px] rounded-full bg-[#E2E8EB] text-[#0F3B59] font-sans">Offline</span>}</td>
                            <td className="px-3 py-3 whitespace-nowrap">{m.location}</td>
                            <td className="px-3 py-3">{m.sifatPerubahan}</td>
                            <td className="px-3 py-3 whitespace-nowrap">{m.anggaranType || "—"}</td>
                            <td className="px-3 py-3 min-w-[220px]">
                              <Link href={`/moc/${m.id}`} className="font-bold text-[#0F172A] hover:text-[#0F3B59] transition-colors">
                                {m.judul || "(tanpa judul)"}
                              </Link>
                              <div className="text-[11.5px] text-[#6b6e72] mt-0.5">{clip(m.latarBelakang, 70)}</div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">{fmtDate(m.approvedAt)}</td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="font-semibold text-[#0F172A] mb-1">{m.registerStatus}</div>
                              <StateTag m={m} />
                            </td>
                            <td className="px-3 py-3 min-w-[150px]">
                              <ForYou r={row} />
                              {row.roles.length > 0 && <div className="text-[11px] text-[#6b6e72] mt-1">Peran Anda: {row.roles.join(", ")}</div>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MocRegisterPage() {
  return (
    <Suspense fallback={<div className="text-[13px] text-[#6b6e72]">Memuat…</div>}>
      <MocRegisterContent />
    </Suspense>
  );
}
