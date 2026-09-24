"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import { usePsi } from "@/lib/psiStore";
import { useMocActor, useMocList } from "@/lib/useMoc";
import { MOC_INITIATOR_ROLE, MOC_REGISTER_STATUSES, mocActionsFor, type MocRequest } from "@/lib/domain/moc";
import { MOC_STATE_META } from "@/lib/domain/statusStyle";
import StatusTag from "@/components/StatusTag";

const CARD =
  "bg-white border border-[#C5CED3] rounded-[8px] shadow-[0_1px_2px_rgba(15,23,42,.05),0_1px_6px_rgba(15,23,42,.04)]";
const SELECT = "text-[13px] px-2.5 py-1.5 border border-[#C5CED3] rounded-[8px] bg-white font-semibold";

function fmtDate(ts?: string | null) {
  if (!ts) return "—";
  const d = new Date(ts.replace(" ", "T"));
  return isNaN(d.getTime()) ? ts : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

const clip = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s || "—");

export default function MocRegisterPage() {
  const { activeUser } = usePsi();
  const actor = useMocActor();
  const { mocs, isLoading, error } = useMocList();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [mineOnly, setMineOnly] = useState(false);
  const [scopeAll, setScopeAll] = useState(false);

  const isAdmin = !!activeUser.isRegionalAdmin;
  const canCreate = !isAdmin && !!activeUser.location && activeUser.role === MOC_INITIATOR_ROLE;
  // Admin Regional & mode "Semua lokasi": hanya-lihat. Non-admin default ke lokasi sendiri.
  const showAll = isAdmin || scopeAll;

  const rows = mocs
    .filter((m) => showAll || m.location === activeUser.location)
    .filter((m) => status === "ALL" || m.registerStatus === status)
    .filter((m) => !mineOnly || mocActionsFor(m, actor).some((a) => a === "review" || a === "decide" || a === "register" || a === "submit"))
    .filter((m) => {
      const q = search.trim().toLowerCase();
      return !q || m.judul.toLowerCase().includes(q) || (m.mocNumber ?? "").toLowerCase().includes(q);
    });

  const StateTag = ({ m }: { m: MocRequest }) => {
    const meta = MOC_STATE_META[m.validationState];
    return <StatusTag color={meta.color} label={meta.label} size="sm" />;
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 className="font-heading text-[18px] font-bold text-[#0F172A]">Register MOC</h1>
          <p className="text-[12px] text-[#6b6e72] mt-0.5">Daftar Management of Change dan tahapnya (Lampiran 8 TKO).</p>
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
          Menunggu tindakan saya
        </label>
      </div>

      {error ? (
        <div className={`${CARD} py-10 px-5 text-center text-[13px] text-[#DC2626]`}>Gagal memuat daftar MOC. Coba muat ulang halaman.</div>
      ) : isLoading ? (
        <div className={`${CARD} py-10 px-5 text-center text-[13px] text-[#6b6e72]`}>Memuat…</div>
      ) : rows.length === 0 ? (
        <div className={`${CARD} py-12 px-5 text-center text-[13px] text-[#9a9da0]`}>Belum ada MOC yang sesuai.</div>
      ) : (
        <div className={`${CARD} overflow-hidden`}>
          <div className="lg:hidden divide-y divide-[#f0f0f1]">
            {rows.map((m) => (
              <Link key={m.id} href={`/moc/${m.id}`} className="block p-3.5 hover:bg-[#E2E8EB]/50 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-mono text-[11px] text-[#9a9da0]">{m.mocNumber ?? "Belum bernomor"}</span>
                  <StateTag m={m} />
                </div>
                <div className="font-semibold text-[13.5px] text-[#0F172A] mb-1">{m.judul || "(tanpa judul)"}</div>
                <div className="text-[12px] text-[#6b6e72]">{m.location} · {m.sifatPerubahan} · {m.registerStatus}</div>
              </Link>
            ))}
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-[#6b6e72] border-b border-[#C5CED3] bg-[#E2E8EB]">
                  {["No.", "No MOC", "Lokasi", "Region/AP", "Type Anggaran", "Sifat", "Judul Perubahan", "Alasan Perubahan", "Tgl. Disetujui", "Status"].map((h) => (
                    <th key={h} className="px-3 py-2.5 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((m, i) => (
                  <tr key={m.id} className="border-b border-[#f0f0f1] last:border-0 hover:bg-[#E2E8EB]/40 transition-colors align-top">
                    <td className="px-3 py-3 text-[#9a9da0] font-mono tabular-nums">{i + 1}</td>
                    <td className="px-3 py-3 font-mono text-[11.5px] text-[#3a3d40] whitespace-nowrap">{m.mocNumber ?? "—"}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{m.location}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{m.region}</td>
                    <td className="px-3 py-3">{m.anggaranType || "—"}</td>
                    <td className="px-3 py-3">{m.sifatPerubahan}</td>
                    <td className="px-3 py-3 min-w-[200px]">
                      <Link href={`/moc/${m.id}`} className="font-bold text-[#0F172A] hover:text-[#0F3B59] transition-colors">
                        {m.judul || "(tanpa judul)"}
                      </Link>
                    </td>
                    <td className="px-3 py-3 min-w-[200px] text-[#3a3d40]">{clip(m.latarBelakang)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{fmtDate(m.approvedAt)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="font-semibold text-[#0F172A] mb-1">{m.registerStatus}</div>
                      <StateTag m={m} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
