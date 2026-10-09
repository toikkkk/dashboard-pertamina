"use client";

// Log Aktivitas (jejak audit) — hanya Admin Regional. Menampilkan login/logout, perubahan akun & akses, atur
// ulang sandi, unduhan berkas, dan perubahan dokumen (siapa, kapan WIB, sasaran, lokasi, alamat IP).
import React, { useState } from "react";
import useSWR from "swr";
import { Search, ShieldAlert, ScrollText } from "lucide-react";
import { usePsi } from "@/lib/psiStore";

interface AuditRow {
  id: string;
  createdAt: string;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetLabel: string | null;
  location: string | null;
  ipAddress: string | null;
  detail: Record<string, unknown> | null;
}

const GROUPS = [
  { key: "", label: "Semua" },
  { key: "masuk", label: "Masuk & keluar" },
  { key: "akun", label: "Akun" },
  { key: "akses", label: "Perubahan akses" },
  { key: "sandi", label: "Sandi" },
  { key: "berkas", label: "Unduhan berkas" },
  { key: "dokumen", label: "Dokumen" },
];

const ACTION_LABEL: Record<string, { label: string; color: string }> = {
  "login.berhasil": { label: "Masuk", color: "#15803D" },
  "login.gagal": { label: "Gagal masuk", color: "#B45309" },
  "login.diblokir": { label: "Percobaan diblokir", color: "#DC2626" },
  logout: { label: "Keluar", color: "#6b6e72" },
  "akun.daftar": { label: "Akun baru mendaftar", color: "#0F3B59" },
  "akun.dihapus": { label: "Akun dihapus", color: "#DC2626" },
  "akses.diubah": { label: "Akses diubah", color: "#6D28D9" },
  "sandi.diatur_ulang": { label: "Sandi diatur ulang", color: "#B45309" },
  "berkas.unduh": { label: "Berkas dibuka/diunduh", color: "#0F3B59" },
  "dokumen.dibuat": { label: "Dokumen dibuat", color: "#15803D" },
  "dokumen.dipindah": { label: "Dokumen dipindah", color: "#0F3B59" },
  "dokumen.direvisi": { label: "Dokumen direvisi", color: "#6D28D9" },
  "dokumen.diubah": { label: "Dokumen diubah", color: "#6D28D9" },
  "dokumen.dihapus": { label: "Dokumen ke Sampah", color: "#B45309" },
  "dokumen.dipulihkan": { label: "Dokumen dipulihkan", color: "#15803D" },
  "dokumen.dihapus_permanen": { label: "Dokumen dihapus permanen", color: "#DC2626" },
};

const fetcher = (u: string) => fetch(u).then((r) => (r.ok ? r.json() : Promise.reject(new Error("gagal"))));
const fmt = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

export default function AuditPage() {
  const { activeUser } = usePsi();
  const [group, setGroup] = useState("");
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const { data, isLoading, error } = useSWR<{ rows: AuditRow[]; total: number }>(
    activeUser.isRegionalAdmin ? `/api/admin/audit?kelompok=${encodeURIComponent(group)}&q=${encodeURIComponent(q)}` : null,
    fetcher,
    { refreshInterval: 20000 }
  );

  if (!activeUser.isRegionalAdmin) {
    return (
      <div className="bg-white border border-[#D8E1E4] rounded-[12px] py-[60px] px-5 text-center">
        <ShieldAlert className="w-8 h-8 text-[#c3c6c9] mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-sm font-bold text-[#3a3d40]">Halaman ini hanya untuk Admin Regional.</p>
      </div>
    );
  }

  const rows = data?.rows ?? [];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <ScrollText className="w-[18px] h-[18px] text-[#0F3B59]" strokeWidth={1.8} />
        <h1 className="font-heading text-[18px] font-bold text-[#0F172A]">Log Aktivitas</h1>
        {data && <span className="font-mono text-[12px] text-[#6b6e72]">{data.total.toLocaleString("id-ID")} catatan</span>}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <form
          onSubmit={(e) => { e.preventDefault(); setQ(qInput.trim()); }}
          className="relative flex-1 min-w-[240px] max-w-[420px]"
        >
          <Search className="w-3.5 h-3.5 text-[#9a9da0] absolute left-[11px] top-1/2 -translate-y-1/2" strokeWidth={1.8} />
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Cari nama, email, sasaran, lokasi, atau IP…"
            aria-label="Cari log"
            className="w-full min-h-[38px] pl-[34px] pr-3 text-[13px] border border-[#C5CED3] rounded-[8px] bg-white focus:outline-none focus:border-[#0F3B59]"
          />
        </form>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Kelompok aksi">
          {GROUPS.map((g) => (
            <button
              key={g.key}
              type="button"
              aria-pressed={group === g.key}
              onClick={() => setGroup(g.key)}
              className={`px-3 py-1.5 rounded-full border text-[12.5px] font-semibold transition-colors duration-150 ${group === g.key ? "border-[#0F3B59] bg-[#0F3B59] text-white" : "border-[#C5CED3] bg-white text-[#0F172A] hover:bg-[#F0F4F6]"}`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-[#D8E1E4] rounded-[14px] overflow-x-auto">
        {error ? (
          <p className="py-14 text-center text-[13px] text-[#DC2626]">Gagal memuat log.</p>
        ) : isLoading ? (
          <p className="py-14 text-center text-[13px] text-[#9a9da0]">Memuat log…</p>
        ) : rows.length === 0 ? (
          <p className="py-14 text-center text-[13px] text-[#9a9da0]">Belum ada catatan{q || group ? " yang cocok" : ""}.</p>
        ) : (
          <table className="w-full min-w-[820px] text-[12.5px] border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] text-left text-[10.5px] font-bold tracking-[.05em] uppercase text-[#6b6e72]">
                <th className="px-4 py-2.5">Waktu (WIB)</th>
                <th className="px-3 py-2.5">Pelaku</th>
                <th className="px-3 py-2.5">Aksi</th>
                <th className="px-3 py-2.5">Sasaran</th>
                <th className="px-3 py-2.5">Lokasi</th>
                <th className="px-3 py-2.5">IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const meta = ACTION_LABEL[r.action] ?? { label: r.action, color: "#6b6e72" };
                return (
                  <tr key={r.id} className="border-t border-[#EEF2F4] hover:bg-[#F8F9FA] align-top">
                    <td className="px-4 py-2.5 font-mono text-[11.5px] text-[#3a3d40] whitespace-nowrap">{fmt(r.createdAt)}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-[#0F172A]">{r.actorName ?? "—"}</div>
                      <div className="text-[11px] text-[#9a9da0]">{r.actorEmail ?? ""}</div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-[3px] rounded-full" style={{ background: meta.color }} aria-hidden />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 max-w-[320px]">
                      <div className="truncate" title={r.targetLabel ?? ""}>{r.targetLabel ?? "—"}</div>
                      {r.detail && Object.keys(r.detail).length > 0 && (
                        <div className="text-[11px] text-[#9a9da0] truncate" title={JSON.stringify(r.detail)}>{JSON.stringify(r.detail)}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{r.location ?? "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-[11.5px] text-[#6b6e72] whitespace-nowrap">{r.ipAddress ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {rows.length >= 200 && <p className="mt-2 text-[11.5px] text-[#9a9da0]">Menampilkan 200 catatan terbaru — persempit dengan pencarian atau kelompok.</p>}
    </div>
  );
}
