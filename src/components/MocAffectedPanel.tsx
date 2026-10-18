"use client";

// Kartu "PSI terdampak" di detail MOC: dokumen Direktori (lokasi yang sama) yang berubah akibat MOC ini.
// Pembuat MOC / Controller lokasi menandai atau melepas; status "Sudah diperbarui" dihitung dari riwayat dokumen.
import React, { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { X } from "lucide-react";
import { usePsi } from "@/lib/psiStore";
import { mocCanEditAffected, type MocAffectedDoc, type MocRequest } from "@/lib/domain/moc";

const CARD = "bg-white border border-[#D8E1E4] rounded-[12px] shadow-[0_2px_6px_rgba(15,23,42,.045)]";
const fetcher = async (url: string) => {
  const r = await fetch(url, { credentials: "same-origin" });
  if (!r.ok) throw new Error("Gagal memuat.");
  return (await r.json()) as { items: MocAffectedDoc[] };
};

export default function MocAffectedPanel({ moc }: { moc: MocRequest }) {
  const { activeUser, allDocuments } = usePsi();
  const key = `/api/moc/${moc.id}/affected`;
  const { data, mutate } = useSWR(key, fetcher);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = data?.items ?? [];
  const canEdit = mocCanEditAffected(moc, { id: activeUser.id, name: activeUser.name, role: activeUser.role, location: activeUser.location, isRegionalAdmin: !!activeUser.isRegionalAdmin });
  const taken = new Set(items.map((i) => i.documentId));
  const options = allDocuments.filter((d) => d.location === moc.location && !taken.has(d.id)).sort((a, b) => a.documentNumber.localeCompare(b.documentNumber));

  const call = async (method: "POST" | "DELETE", documentId: string) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(key, { method, headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ documentId }) });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error ?? "Gagal menyimpan.");
      await mutate(body, { revalidate: false });
      setPick("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  };

  if (!canEdit && items.length === 0) return null;
  return (
    <div className={`${CARD} p-5`}>
      <h2 className="text-[13.5px] font-bold text-[#0F172A] mb-3">PSI terdampak</h2>
      {items.length === 0 ? (
        <p className="text-[12.5px] text-[#9a9da0]">Belum ada dokumen PSI yang ditandai terdampak.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-[#EDF0F2]">
          {items.map((d) => (
            <li key={d.documentId} className="py-2 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <Link href={`/document/${d.documentId}`} className="text-[13px] font-semibold text-[#0F3B59] hover:underline">
                  <span className="font-mono">{d.documentNumber}</span> — {d.title}
                </Link>
                <div className="text-[11.5px] text-[#6b6e72]">
                  Versi saat ditandai {d.baselineVersion}
                  {d.currentVersion !== d.baselineVersion ? `, kini ${d.currentVersion}` : ""} · ditandai {d.addedByName}
                </div>
              </div>
              <span className="text-[12px] font-semibold whitespace-nowrap" style={{ color: d.updated ? "#15803D" : "#B45309" }}>
                {d.updated ? "Sudah diperbarui" : "Belum diperbarui"}
              </span>
              {canEdit && (
                <button type="button" aria-label="Lepas dokumen" disabled={busy} onClick={() => call("DELETE", d.documentId)} className="p-1 text-[#6b6e72] hover:text-[#DC2626]">
                  <X className="w-4 h-4" strokeWidth={2} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <div className="flex items-center gap-2 mt-3">
          <select
            className="w-full min-h-[38px] px-3 py-2 text-[13px] border border-[#C5CED3] rounded-[8px] bg-white"
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            aria-label="Pilih dokumen PSI terdampak"
          >
            <option value="">Pilih dokumen PSI dari Direktori…</option>
            {options.map((d) => (
              <option key={d.id} value={d.id}>{d.documentNumber} — {d.title}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy || !pick}
            onClick={() => call("POST", pick)}
            className="px-5 py-2 rounded-full bg-[#0F3B59] hover:bg-[#0B2C43] text-white text-[13px] font-bold disabled:opacity-50 whitespace-nowrap"
          >
            Tandai
          </button>
        </div>
      )}
      {error && <p role="alert" className="text-[12.5px] font-semibold text-[#DC2626] mt-2">{error}</p>}
    </div>
  );
}
