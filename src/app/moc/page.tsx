"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus } from "lucide-react";
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

export default function MocRegisterPage() {
  const { activeUser } = usePsi();
  const actor = useMocActor();
  const router = useRouter();
  const { mocs, isLoading, error } = useMocList();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [mineOnly, setMineOnly] = useState(false);
  const [scopeAll, setScopeAll] = useState(false);

  const isAdmin = !!activeUser.isRegionalAdmin;
  const canCreate = !isAdmin && !!activeUser.location && activeUser.role === MOC_INITIATOR_ROLE;
  // Admin Regional & mode "Semua lokasi": hanya-lihat. Non-admin default ke lokasi sendiri.
  const showAll = isAdmin || scopeAll;

  const rows: Row[] = mocs
    .filter((m) => showAll || m.location === activeUser.location)
    .filter((m) => status === "ALL" || m.registerStatus === status)
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
        {canCreate && (
          <Link
            href="/moc/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0F3B59] hover:bg-[#0B2C43] text-white text-[13px] font-bold transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={2.2} /> MOC Baru
          </Link>
        )}
      </div>

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
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${SELECT} min-w-[170px]`} aria-label="Status perubahan">
          <option value="ALL">Semua Status</option>
          {MOC_REGISTER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {!isAdmin && !!activeUser.location && (
          <select
            value={scopeAll ? "ALL" : "OWN"}
            onChange={(e) => setScopeAll(e.target.value === "ALL")}
            className={`${SELECT} min-w-[200px]`}
            aria-label="Cakupan lokasi"
          >
            <option value="OWN">Lokasi saya ({activeUser.location})</option>
            <option value="ALL">Semua lokasi (lihat saja)</option>
          </select>
        )}
        <label className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#0F172A] cursor-pointer">
          <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
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
                        <span className="font-mono text-[11px] text-[#9a9da0]">{m.mocNumber ?? "Belum bernomor"}</span>
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
                        {["No MOC", "Lokasi", "Sifat", "Judul Perubahan", "Tgl. Disetujui", "Status", "Untuk Anda"].map((h) => (
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
                            <td className="px-3 py-3 font-mono text-[11.5px] text-[#3a3d40] whitespace-nowrap">{m.mocNumber ?? "—"}</td>
                            <td className="px-3 py-3 whitespace-nowrap">{m.location}</td>
                            <td className="px-3 py-3">{m.sifatPerubahan}</td>
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
