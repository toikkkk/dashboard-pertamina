"use client";

// Sampah: dokumen yang dihapus dan masih bisa dipulihkan. Semua user yang sudah onboarded melihat semua
// lokasi; Pulihkan / Hapus permanen (satuan maupun massal) hanya untuk Admin Regional atau Controller lokasi
// dokumen (server memeriksa ulang per dokumen). Setelah TRASH_RETENTION_DAYS hari dokumen dihapus permanen
// oleh tugas terjadwal.
import React, { useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Download, RotateCcw, Search, Trash2, X } from "lucide-react";
import { TRASH_URGENT_DAYS, type TrashedDocument } from "@/lib/domain/trash";

const fetcher = (u: string) =>
  fetch(u).then(async (r) => {
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Gagal memuat Sampah.");
    return r.json();
  });

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

const REFRESH_KEYS = /^\/api\/(bootstrap|directory|document-categories|documents\/trash)/;

interface BulkResult {
  results: { id: string; ok: boolean; error?: string }[];
  done: number;
  failed: number;
}

function PurgeConfirm({ docs, busy, error, onClose, onConfirm }: { docs: TrashedDocument[]; busy: boolean; error: string | null; onClose: () => void; onConfirm: () => void }) {
  const many = docs.length > 1;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0F172A]/40 px-4 animate-backdropIn" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div role="alertdialog" aria-modal="true" aria-label="Hapus permanen" className="w-full max-w-[460px] rounded-[14px] bg-white overflow-hidden shadow-[0_24px_60px_-12px_rgba(15,23,42,.35)] animate-modalPop">
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-[#B91C1C] text-white">
          <h2 className="font-heading text-[15px] font-bold flex items-center gap-2"><Trash2 className="w-4 h-4" strokeWidth={2.2} /> Hapus permanen</h2>
          <button onClick={onClose} disabled={busy} aria-label="Tutup" className="text-white/80 hover:text-white disabled:opacity-40"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-3">
          <p className="text-[13px] text-[#0F172A] leading-relaxed">
            {many ? <><strong>{docs.length} dokumen</strong></> : <strong>{docs[0].title}</strong>} beserta riwayat dan berkasnya di penyimpanan (kecuali berkas yang masih dipakai data lain) akan <strong>dihapus permanen</strong> dan tidak dapat dipulihkan.
          </p>
          {error && <p role="alert" className="text-[11.5px] font-semibold text-[#DC2626]">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#EEF2F4]">
          <button onClick={onClose} disabled={busy} className="px-4 py-2 text-[13px] font-bold text-[#0F3B59] rounded-full hover:bg-[#E2E8EB] disabled:opacity-50">Batal</button>
          <button onClick={onConfirm} disabled={busy} className="px-5 py-2 text-[13px] font-bold rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white disabled:opacity-50 transition-colors">
            {busy ? "Menghapus…" : many ? `Hapus permanen (${docs.length})` : "Hapus permanen"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SampahPage() {
  const { data, error, isLoading, mutate } = useSWR<TrashedDocument[]>("/api/documents/trash", fetcher);
  const { mutate: globalMutate } = useSWRConfig();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [purgeTargets, setPurgeTargets] = useState<TrashedDocument[] | null>(null);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const all = data ?? [];
    if (!term) return all;
    return all.filter((d) => [d.title, d.documentNumber, d.location, d.categoryName ?? "", d.deletedByName ?? ""].some((v) => v.toLowerCase().includes(term)));
  }, [data, q]);

  const manageable = rows.filter((d) => d.canManage);
  const urgentCount = (data ?? []).filter((d) => d.daysLeft <= TRASH_URGENT_DAYS).length;
  const picked = manageable.filter((d) => selected.has(d.id));
  const allPicked = manageable.length > 0 && picked.length === manageable.length;

  const toggle = (id: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () => setSelected(allPicked ? new Set() : new Set(manageable.map((d) => d.id)));

  const run = async (action: "restore" | "purge", targets: TrashedDocument[]) => {
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/documents/trash/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ids: targets.map((t) => t.id) }) });
      const body = (await res.json().catch(() => ({}))) as Partial<BulkResult> & { error?: string };
      if (!res.ok) throw new Error(body.error || "Aksi gagal.");
      const verb = action === "restore" ? "dipulihkan" : "dihapus permanen";
      if (body.done) setNotice(targets.length === 1 && body.done === 1 ? `"${targets[0].title}" ${verb}.` : `${body.done} dokumen ${verb}.`);
      if (body.failed) {
        const first = body.results?.find((r) => !r.ok)?.error;
        setActionError(`${body.failed} dokumen gagal${first ? `: ${first}` : "."}`);
      } else {
        setPurgeTargets(null);
      }
      setSelected(new Set());
      await mutate();
      await globalMutate((key) => typeof key === "string" && REFRESH_KEYS.test(key));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Aksi gagal.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Trash2 className="w-[18px] h-[18px] text-[#0F3B59]" strokeWidth={1.8} />
        <h1 className="font-heading text-[18px] font-bold text-[#0F172A]">Sampah</h1>
        {data && <span className="font-mono text-[12px] text-[#6b6e72]">{data.length.toLocaleString("id-ID")} dokumen</span>}
        {urgentCount > 0 && (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0F172A]">
            <span className="w-2 h-[3px] rounded-full bg-[#DC2626]" aria-hidden />
            {urgentCount} dokumen dihapus permanen dalam {TRASH_URGENT_DAYS} hari
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[240px] max-w-[420px]">
          <Search className="w-3.5 h-3.5 text-[#9a9da0] absolute left-[11px] top-1/2 -translate-y-1/2" strokeWidth={1.8} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari judul, nomor, lokasi, atau penghapus…"
            aria-label="Cari di Sampah"
            className="w-full min-h-[38px] pl-[34px] pr-3 text-[13px] border border-[#C5CED3] rounded-[8px] bg-white focus:outline-none focus:border-[#0F3B59]"
          />
        </div>
        {picked.length > 0 && (
          <div className="flex items-center gap-2" role="group" aria-label="Aksi untuk dokumen terpilih">
            <span className="text-[12.5px] font-bold text-[#0B2C43]">{picked.length} dipilih</span>
            <button type="button" disabled={busy} onClick={() => run("restore", picked)} className="inline-flex items-center gap-1.5 text-[12.5px] font-bold px-3 py-1.5 rounded-full bg-[#0F3B59] hover:bg-[#0B2C43] text-white disabled:opacity-50">
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.2} /> Pulihkan
            </button>
            <button type="button" disabled={busy} onClick={() => { setActionError(null); setPurgeTargets(picked); }} className="inline-flex items-center gap-1.5 text-[12.5px] font-bold px-3 py-1.5 rounded-full border border-[#DC2626] text-[#DC2626] hover:bg-[#FEE2E2] disabled:opacity-50">
              <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} /> Hapus permanen
            </button>
          </div>
        )}
      </div>

      {notice && <p role="status" className="mb-3 text-[12.5px] font-semibold text-[#15803D]">{notice}</p>}
      {actionError && !purgeTargets && <p role="alert" className="mb-3 text-[12.5px] font-semibold text-[#DC2626]">{actionError}</p>}

      <div className="bg-white border border-[#D8E1E4] rounded-[14px] overflow-x-auto">
        {error ? (
          <p className="py-14 text-center text-[13px] text-[#DC2626]">{error instanceof Error ? error.message : "Gagal memuat Sampah."}</p>
        ) : isLoading ? (
          <p className="py-14 text-center text-[13px] text-[#9a9da0]">Memuat…</p>
        ) : rows.length === 0 ? (
          <p className="py-14 text-center text-[13px] text-[#9a9da0]">{q ? "Tidak ada dokumen yang cocok." : "Sampah kosong."}</p>
        ) : (
          <table className="w-full min-w-[940px] text-[12.5px] border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] text-left text-[10.5px] font-bold tracking-[.05em] uppercase text-[#6b6e72]">
                <th className="pl-4 pr-1 py-2.5 w-8">
                  {manageable.length > 0 && (
                    <input type="checkbox" checked={allPicked} onChange={toggleAll} aria-label="Pilih semua yang dapat dikelola" className="w-4 h-4 accent-[#0F3B59]" />
                  )}
                </th>
                <th className="px-3 py-2.5">Dokumen</th>
                <th className="px-3 py-2.5">Lokasi</th>
                <th className="px-3 py-2.5">Sub-dokumen</th>
                <th className="px-3 py-2.5">Dihapus</th>
                <th className="px-3 py-2.5">Sisa</th>
                <th className="px-3 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const urgent = d.daysLeft <= TRASH_URGENT_DAYS;
                return (
                  <tr key={d.id} className={`border-t border-[#EEF2F4] hover:bg-[#F8F9FA] align-top ${selected.has(d.id) ? "bg-[#F0F6FA]" : ""}`}>
                    <td className="pl-4 pr-1 py-2.5">
                      {d.canManage && (
                        <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggle(d.id)} aria-label={`Pilih ${d.title}`} className="w-4 h-4 accent-[#0F3B59]" />
                      )}
                    </td>
                    <td className="px-3 py-2.5 max-w-[320px]">
                      <div className="font-semibold text-[#0F172A] truncate" title={d.title}>{d.title}</div>
                      <div className="font-mono text-[11px] text-[#6b6e72] truncate" title={d.documentNumber}>{d.documentNumber} · v{d.currentVersion}</div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{d.location}</td>
                    <td className="px-3 py-2.5 max-w-[200px] truncate" title={d.categoryName ?? ""}>{d.categoryName ?? "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="font-mono text-[11.5px] text-[#3a3d40]">{fmt(d.deletedAt)}</div>
                      <div className="text-[11px] text-[#9a9da0]">{d.deletedByName ?? "—"}</div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-[3px] rounded-full" style={{ background: urgent ? "#DC2626" : "#9a9da0" }} aria-hidden />
                        <span className={urgent ? "font-semibold text-[#0F172A]" : "text-[#3a3d40]"}>{d.daysLeft} hari</span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        {d.canManage ? (
                          <>
                            <a href={d.fileUrl} aria-label={`Unduh berkas ${d.title}`} title="Unduh berkas" className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[#0F3B59] hover:bg-[#E2E8EB]">
                              <Download className="w-3.5 h-3.5" strokeWidth={2} />
                            </a>
                            <button type="button" disabled={busy} onClick={() => run("restore", [d])} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold text-[#0F3B59] hover:bg-[#E2E8EB] disabled:opacity-50">
                              <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.2} /> Pulihkan
                            </button>
                            <button type="button" disabled={busy} onClick={() => { setActionError(null); setPurgeTargets([d]); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold text-[#DC2626] hover:bg-[#FEE2E2] disabled:opacity-50">
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} /> Hapus permanen
                            </button>
                          </>
                        ) : (
                          <span className="text-[11.5px] text-[#9a9da0]">Hanya lihat</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {purgeTargets && (
        <PurgeConfirm docs={purgeTargets} busy={busy} error={actionError} onClose={() => setPurgeTargets(null)} onConfirm={() => run("purge", purgeTargets)} />
      )}
    </div>
  );
}
