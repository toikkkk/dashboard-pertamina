"use client";

// Hapus MOC: khusus Admin Regional (mis. membersihkan MOC uji coba). Dua langkah dengan konfirmasi; MOC dipindah ke Sampah
// (30 hari) dan bisa dipulihkan dari halaman Sampah, tab MOC.
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { Trash2 } from "lucide-react";
import { useMocActor } from "@/lib/useMoc";
import type { MocRequest } from "@/lib/domain/moc";

export default function MocDeleteSection({ moc }: { moc: MocRequest }) {
  const actor = useMocActor();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!actor.isRegionalAdmin) return null;

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/moc/${moc.id}`, { method: "DELETE", credentials: "same-origin" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error ?? "Gagal memindahkan MOC ke Sampah.");
      await mutate("/api/moc");
      await mutate("/api/moc/trash");
      router.replace("/moc");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memindahkan MOC ke Sampah.");
      setBusy(false);
    }
  };

  return (
    <section className="mt-6 bg-white border border-[#D8E1E4] rounded-[12px] px-5 py-4 flex items-center gap-3 flex-wrap">
      <div className="flex-1 min-w-[220px]">
        <h2 className="text-[13.5px] font-bold text-[#0F172A]">Hapus MOC</h2>
        <p className="text-[12.5px] text-[#6b6e72]">Khusus Admin Regional. MOC dipindah ke Sampah dan disimpan 30 hari; selama itu bisa dipulihkan.</p>
      </div>
      {!confirm ? (
        <button type="button" onClick={() => setConfirm(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#DC2626] text-[#DC2626] hover:bg-[#FEF2F2] text-[13px] font-bold">
          <Trash2 className="w-4 h-4" strokeWidth={2} /> Pindahkan ke Sampah
        </button>
      ) : (
        <div className="flex items-center gap-3 flex-wrap p-3 rounded-[10px] bg-[#FEF2F2] border border-[#DC2626]/30">
          <span className="text-[13px] font-semibold text-[#991B1B]">Pindahkan {moc.mocNumber ?? "MOC ini"} ke Sampah?</span>
          <button type="button" disabled={busy} onClick={remove} className="px-5 py-2 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[13px] font-bold disabled:opacity-50">
            {busy ? "Memindahkan…" : "Ya, pindahkan"}
          </button>
          <button type="button" disabled={busy} onClick={() => setConfirm(false)} className="px-3 py-2 text-[13px] font-bold text-[#0F172A] hover:underline">Batal</button>
        </div>
      )}
      {error && <p role="alert" className="w-full text-[12.5px] font-semibold text-[#DC2626]">{error}</p>}
    </section>
  );
}
