"use client";

// Tab MOC di halaman Sampah (khusus Admin Regional): MOC yang dihapus, bisa dipulihkan atau dihapus permanen.
// Setelah TRASH_RETENTION_DAYS hari MOC dihapus permanen oleh tugas terjadwal.
import React, { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import Link from "next/link";
import { RotateCcw, Trash2, X } from "lucide-react";
import { TRASH_URGENT_DAYS, type TrashedMoc } from "@/lib/domain/trash";

const fetcher = (u: string) =>
  fetch(u).then(async (r) => {
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Gagal memuat Sampah MOC.");
    return r.json();
  });

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

export default function SampahMocPanel() {
  const { data, error, isLoading, mutate } = useSWR<TrashedMoc[]>("/api/moc/trash", fetcher);
  const { mutate: globalMutate } = useSWRConfig();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<TrashedMoc | null>(null);

  const run = async (action: "restore" | "purge", m: TrashedMoc) => {
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/moc/${m.id}/${action}`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Aksi gagal.");
      setNotice(`"${m.judul || "MOC"}" ${action === "restore" ? "dipulihkan ke Register MOC" : "dihapus permanen"}.`);
      setPurgeTarget(null);
      await mutate();
      await globalMutate("/api/moc");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Aksi gagal.");
    } finally {
      setBusy(false);
    }
  };

  const rows = data ?? [];
  return (
    <div>
      {notice && <p role="status" className="mb-3 text-[12.5px] font-semibold text-[#15803D]">{notice}</p>}
      {actionError && !purgeTarget && <p role="alert" className="mb-3 text-[12.5px] font-semibold text-[#DC2626]">{actionError}</p>}

      <div className="bg-white border border-[#D8E1E4] rounded-[14px] overflow-x-auto">
        {error ? (
          <p className="py-14 text-center text-[13px] text-[#DC2626]">{error instanceof Error ? error.message : "Gagal memuat Sampah MOC."}</p>
        ) : isLoading ? (
          <p className="py-14 text-center text-[13px] text-[#9a9da0]">Memuat…</p>
        ) : rows.length === 0 ? (
          <p className="py-14 text-center text-[13px] text-[#9a9da0]">Tidak ada MOC di Sampah.</p>
        ) : (
          <table className="w-full min-w-[820px] text-[12.5px] border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] text-left text-[10.5px] font-bold tracking-[.05em] uppercase text-[#6b6e72]">
                <th className="px-4 py-2.5">MOC</th>
                <th className="px-3 py-2.5">Lokasi</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Dihapus</th>
                <th className="px-3 py-2.5">Sisa</th>
                <th className="px-3 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const urgent = m.daysLeft <= TRASH_URGENT_DAYS;
                return (
                  <tr key={m.id} className="border-t border-[#EEF2F4] hover:bg-[#F8F9FA] align-top">
                    <td className="px-4 py-2.5 max-w-[320px]">
                      <div className="font-semibold text-[#0F172A] truncate" title={m.judul}>{m.judul || "(tanpa judul)"}</div>
                      <div className="font-mono text-[11px] text-[#6b6e72] truncate">{m.mocNumber ?? "Belum bernomor"}{m.isOffline ? " · Offline" : ""}</div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{m.location}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-[#3a3d40]">{m.registerStatus}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="font-mono text-[11.5px] text-[#3a3d40]">{fmt(m.deletedAt)}</div>
                      <div className="text-[11px] text-[#9a9da0]">{m.deletedByName ?? "—"}</div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-[3px] rounded-full" style={{ background: urgent ? "#DC2626" : "#9a9da0" }} aria-hidden />
                        <span className={urgent ? "font-semibold text-[#0F172A]" : "text-[#3a3d40]"}>{m.daysLeft} hari</span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <button type="button" disabled={busy} onClick={() => run("restore", m)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold text-[#0F3B59] hover:bg-[#E2E8EB] disabled:opacity-50">
                          <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.2} /> Pulihkan
                        </button>
                        <button type="button" disabled={busy} onClick={() => { setActionError(null); setPurgeTarget(m); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold text-[#DC2626] hover:bg-[#FEE2E2] disabled:opacity-50">
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} /> Hapus permanen
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-[12px] text-[#6b6e72]">
        MOC dihapus permanen otomatis setelah 30 hari di Sampah. <Link href="/moc" className="font-bold text-[#0F3B59] hover:underline">Ke Register MOC</Link>
      </p>

      {purgeTarget && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0F172A]/40 px-4 animate-backdropIn" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setPurgeTarget(null); }}>
          <div role="alertdialog" aria-modal="true" aria-label="Hapus permanen MOC" className="w-full max-w-[460px] rounded-[14px] bg-white overflow-hidden shadow-[0_24px_60px_-12px_rgba(15,23,42,.35)] animate-modalPop">
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-[#B91C1C] text-white">
              <h2 className="font-heading text-[15px] font-bold flex items-center gap-2"><Trash2 className="w-4 h-4" strokeWidth={2.2} /> Hapus permanen</h2>
              <button onClick={() => setPurgeTarget(null)} disabled={busy} aria-label="Tutup" className="text-white/80 hover:text-white disabled:opacity-40"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              <p className="text-[13px] text-[#0F172A] leading-relaxed">
                <strong>{purgeTarget.judul || "MOC ini"}</strong> beserta review, riwayat, bukti tanda tangan, dan PSI terdampaknya akan <strong>dihapus permanen</strong> dan tidak dapat dipulihkan.
              </p>
              {actionError && <p role="alert" className="text-[11.5px] font-semibold text-[#DC2626]">{actionError}</p>}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#EEF2F4]">
              <button onClick={() => setPurgeTarget(null)} disabled={busy} className="px-4 py-2 text-[13px] font-bold text-[#0F3B59] rounded-full hover:bg-[#E2E8EB] disabled:opacity-50">Batal</button>
              <button onClick={() => run("purge", purgeTarget)} disabled={busy} className="px-5 py-2 text-[13px] font-bold rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white disabled:opacity-50 transition-colors">
                {busy ? "Menghapus…" : "Hapus permanen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
