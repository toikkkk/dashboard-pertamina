"use client";

// Kartu "Terkait MOC" di halaman dokumen: MOC yang menandai dokumen ini sebagai terdampak. Bila lebih dari satu MOC
// masih berjalan untuk dokumen yang sama, semuanya tampil agar pengunggah pembaruan tahu ada MOC lain.
import React from "react";
import Link from "next/link";
import useSWR from "swr";
import type { MocAffectedByDoc } from "@/lib/domain/moc";

const fetcher = async (url: string) => {
  const r = await fetch(url, { credentials: "same-origin" });
  if (!r.ok) throw new Error("Gagal memuat.");
  return (await r.json()) as { items: MocAffectedByDoc[] };
};

export default function DocumentMocCard({ documentId }: { documentId: string }) {
  const { data } = useSWR(`/api/documents/${documentId}/moc`, fetcher);
  const items = data?.items ?? [];
  if (items.length === 0) return null;
  const running = items.filter((m) => m.registerStatus !== "Closed");
  return (
    <section className="bg-white border border-[#D8E1E4] rounded-[12px] px-5 py-4 mb-4">
      <h2 className="text-[13.5px] font-bold text-[#0F172A] mb-2">Terkait MOC</h2>
      {running.length > 1 && (
        <p className="text-[12.5px] font-semibold text-[#B45309] mb-2">
          {running.length} MOC yang masih berjalan menyangkut dokumen ini. Pastikan pembaruan memakai versi terbaru.
        </p>
      )}
      <ul className="flex flex-col divide-y divide-[#EDF0F2]">
        {items.map((m) => (
          <li key={m.mocId} className="py-2 flex items-center gap-3 flex-wrap">
            <Link href={`/moc/${m.mocId}`} className="text-[13px] font-semibold text-[#0F3B59] hover:underline">
              {m.mocNumber ? <span className="font-mono">{m.mocNumber}</span> : "MOC (belum bernomor)"} — {m.judul || "Tanpa judul"}
            </Link>
            <span className="text-[12px] text-[#6b6e72]">Tahap {m.registerStatus} · ditandai pada versi {m.baselineVersion}</span>
            <span className="text-[12px] font-semibold ml-auto" style={{ color: m.updated ? "#15803D" : "#B45309" }}>
              {m.updated ? "Sudah diperbarui karena MOC ini" : "Menunggu pembaruan"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
