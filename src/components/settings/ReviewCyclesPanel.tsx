"use client";

// Pengaturan > Siklus tinjau (khusus Admin Regional): lama berlaku (siklus tinjau, dalam bulan) tiap sub-dokumen.
// Mengubah siklus berlaku untuk sub-dokumen dengan nama itu di semua lokasi; dokumen yang sudah ada hanya dihitung
// ulang bila dicentang, dan sebelum disimpan ditampilkan berapa dokumen yang terdampak.
import React, { useMemo, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { Search, Check } from "lucide-react";
import { PSI_CHAPTERS } from "@/lib/domain/psiSubChapters";

interface Item { name: string; chapter: string | null; no: number | null; months: number[]; locations: number; docs: number; isCustom: boolean }

const fetcher = (u: string) => fetch(u).then((r) => (r.ok ? r.json() : Promise.reject(new Error("gagal"))));
const cycleText = (m: number) => (m % 12 === 0 ? `${m / 12} tahun` : `${m} bulan`);
const INPUT = "min-h-[34px] px-2.5 text-[13px] border border-[#C5CED3] rounded-[8px] bg-white focus:outline-none focus:border-[#0F3B59]";

export default function ReviewCyclesPanel() {
  const { data, error, isLoading, mutate } = useSWR<{ items: Item[] }>("/api/admin/review-cycles", fetcher);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [recalc, setRecalc] = useState(false);
  const [preview, setPreview] = useState<{ docsAffected: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const items = useMemo(() => (data?.items ?? []).filter((i) => !q.trim() || i.name.toLowerCase().includes(q.trim().toLowerCase())), [data, q]);
  const months = Number(value);
  const valid = Number.isInteger(months) && months >= 1 && months <= 600;

  const call = async (name: string, dryRun: boolean) => {
    const res = await fetch("/api/admin/review-cycles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, months, recalc, dryRun }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Gagal menyimpan.");
    return body as { docsAffected: number };
  };

  const open = (it: Item) => {
    setEditing(it.name);
    setValue(String(it.months[0] ?? 60));
    setRecalc(false);
    setPreview(null);
    setMsg(null);
  };

  const refreshPreview = async (name: string, nextRecalc: boolean) => {
    setPreview(null);
    if (!nextRecalc || !valid) return;
    try {
      const r = await fetch("/api/admin/review-cycles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, months, recalc: true, dryRun: true }) });
      if (r.ok) setPreview(await r.json());
    } catch { /* pratinjau opsional */ }
  };

  const save = async (it: Item) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await call(it.name, false);
      setMsg({ tone: "ok", text: `Siklus "${it.name}" menjadi ${cycleText(months)}${recalc ? `; ${r.docsAffected} dokumen dihitung ulang` : ""}.` });
      setEditing(null);
      await mutate();
      void globalMutate("/api/bootstrap");
      void globalMutate("/api/directory/overview");
    } catch (e) {
      setMsg({ tone: "err", text: e instanceof Error ? e.message : "Gagal menyimpan." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white border border-[#D8E1E4] rounded-[14px] p-5">
      <div className="relative mb-3 max-w-[360px]">
        <Search className="w-3.5 h-3.5 text-[#9a9da0] absolute left-[11px] top-1/2 -translate-y-1/2" strokeWidth={1.8} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari sub-dokumen..." className={`${INPUT} w-full pl-[34px]`} />
      </div>
      {msg && <p role="status" className={`mb-3 text-[12.5px] font-semibold ${msg.tone === "ok" ? "text-[#15803D]" : "text-[#DC2626]"}`}>{msg.text}</p>}
      {error ? (
        <p className="text-[13px] text-[#DC2626]">Gagal memuat daftar. Coba muat ulang halaman.</p>
      ) : isLoading ? (
        <p className="text-[13px] text-[#6b6e72]">Memuat…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-[#6b6e72] border-b border-[#C5CED3] bg-[#F2F5F7]">
                <th className="px-3 py-2">Sub-dokumen</th>
                <th className="px-3 py-2 whitespace-nowrap">Lokasi</th>
                <th className="px-3 py-2">Dokumen</th>
                <th className="px-3 py-2">Siklus tinjau</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const isEditing = editing === it.name;
                const ch = PSI_CHAPTERS.find((c) => c.key === it.chapter);
                return (
                  <React.Fragment key={it.name}>
                    <tr className="border-b border-[#EEF2F4] align-top">
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-[#0F172A]">{it.no ? `${it.no}. ` : ""}{it.name}</div>
                        <div className="text-[11px] text-[#6b6e72]">{ch ? `${ch.label} · ${ch.title}` : "Di luar daftar PSI"}</div>
                      </td>
                      <td className="px-3 py-2.5 font-mono">{it.locations}</td>
                      <td className="px-3 py-2.5 font-mono">{it.docs}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {it.months.map(cycleText).join(" / ")}
                        {it.months.length > 1 && <span className="ml-1.5 text-[11px] text-[#B45309]">(berbeda antar lokasi)</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button type="button" onClick={() => (isEditing ? setEditing(null) : open(it))} className="text-[12.5px] font-semibold text-[#0F3B59] hover:underline">
                          {isEditing ? "Tutup" : "Ubah"}
                        </button>
                      </td>
                    </tr>
                    {isEditing && (
                      <tr className="border-b border-[#EEF2F4] bg-[#F8FAFB]">
                        <td colSpan={5} className="px-3 py-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-2 text-[12.5px] font-semibold">
                              Siklus
                              <input
                                type="number"
                                min={1}
                                max={600}
                                className={`${INPUT} w-[90px]`}
                                value={value}
                                onChange={(e) => { setValue(e.target.value); setPreview(null); }}
                                onBlur={() => void refreshPreview(it.name, recalc)}
                              />
                              bulan
                              {valid && <span className="text-[11.5px] font-normal text-[#6b6e72]">= {cycleText(months)}</span>}
                            </label>
                            <label className="flex items-center gap-1.5 text-[12.5px] font-semibold cursor-pointer">
                              <input type="checkbox" checked={recalc} onChange={(e) => { setRecalc(e.target.checked); void refreshPreview(it.name, e.target.checked); }} />
                              Hitung ulang masa berlaku dokumen yang sudah ada
                            </label>
                            {recalc && preview && <span className="text-[12px] font-semibold text-[#B45309]">{preview.docsAffected} dokumen akan berubah tanggal berlakunya</span>}
                            <button
                              type="button"
                              disabled={!valid || busy}
                              onClick={() => void save(it)}
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#0F3B59] hover:bg-[#0B2C43] text-white text-[12.5px] font-bold disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" strokeWidth={2.4} /> {busy ? "Menyimpan…" : "Simpan"}
                            </button>
                          </div>
                          <p className="text-[11px] text-[#6b6e72] mt-2">Berlaku untuk sub-dokumen ini di semua lokasi. Tanggal berlaku dokumen baru = tanggal terbit + siklus.</p>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
