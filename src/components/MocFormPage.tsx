"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePsi } from "@/lib/psiStore";
import { mocApi, useMocActions, useMocItem } from "@/lib/useMoc";
import { MOC_INITIATOR_ROLE, type MocFormContent } from "@/lib/domain/moc";
import MocFormFields, { emptyMocForm, pickMocForm } from "@/components/MocFormFields";

// Satu komponen untuk /moc/new (buat) dan /moc/[id]/ubah (ubah) — isinya form yang
// sama, hanya beda pemanggilan API. Menyimpan hanya menyimpan DRAF; pengajuan ke
// reviewer dilakukan dari halaman detail (perlu memilih reviewer & approver).
export default function MocFormPage({ mocId }: { mocId?: string }) {
  const router = useRouter();
  const { activeUser } = usePsi();
  const { moc, isLoading, error } = useMocItem(mocId ?? "");
  const actions = useMocActions(moc);
  const [form, setForm] = useState<MocFormContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canCreate = !activeUser.isRegionalAdmin && !!activeUser.location && activeUser.role === MOC_INITIATOR_ROLE;

  useEffect(() => {
    if (form) return;
    if (!mocId) setForm(emptyMocForm({ unitOperasi: activeUser.location ?? "" }));
    else if (moc) setForm(pickMocForm(moc));
  }, [form, mocId, moc, activeUser.location]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setMessage(null);
    try {
      // Tanggal opsional dikirim "" (bukan undefined) agar bisa dikosongkan di server.
      const payload = { ...form, validFrom: form.validFrom ?? "", validUntil: form.validUntil ?? "" };
      const saved = mocId ? await mocApi.update(mocId, payload) : await mocApi.create(payload);
      router.push(`/moc/${saved.id}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal menyimpan.");
      setSaving(false);
    }
  };

  if (!mocId && !canCreate) {
    return (
      <div className="bg-white border border-[#C5CED3] rounded-[8px] p-6 text-[13px] text-[#0F172A]">
        Hanya akun <strong>Initiator</strong> di sebuah lokasi yang dapat membuat MOC. Admin Regional hanya dapat melihat MOC lokasi.
      </div>
    );
  }
  if (mocId) {
    if (isLoading || (!moc && !error)) return <div className="text-[13px] text-[#6b6e72]">Memuat MOC…</div>;
    if (error || !moc) return <div className="text-[13px] text-[#DC2626]">MOC tidak ditemukan.</div>;
    if (!actions.includes("edit")) {
      return (
        <div className="bg-white border border-[#C5CED3] rounded-[8px] p-6 text-[13px]">
          MOC ini tidak dapat diubah pada tahap sekarang.{" "}
          <Link href={`/moc/${mocId}`} className="font-bold text-[#0F3B59] hover:underline">Kembali ke detail</Link>
        </div>
      );
    }
  }
  if (!form) return null;

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="mb-4">
        <h1 className="font-heading text-[18px] font-bold text-[#0F172A]">{mocId ? "Ubah MOC" : "MOC Baru"}</h1>
      </div>

      <MocFormFields value={form} onChange={(patch) => setForm({ ...form, ...patch })} disabled={saving} location={moc?.location ?? activeUser.location ?? undefined} />

      {/* Bilah aksi menempel di bawah layar: form ini panjang, tombol simpan tak perlu dicari di dasar halaman. */}
      <div className="sticky bottom-3 z-20 mt-5 flex flex-wrap items-center gap-2.5 px-4 py-3 rounded-[14px] bg-white/95 backdrop-blur border border-[#D8E1E4] shadow-[0_8px_24px_-8px_rgba(15,23,42,.25)]">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-5 py-2 rounded-full bg-[#0F3B59] hover:bg-[#0B2C43] text-white text-[13px] font-bold disabled:opacity-60 transition-colors"
        >
          {saving ? "Menyimpan…" : "Simpan Draf"}
        </button>
        <Link href={mocId ? `/moc/${mocId}` : "/moc"} className="px-4 py-2 text-[13px] font-bold text-[#0F172A] hover:underline">
          Batal
        </Link>
        {message && (
          <p role="alert" className="ml-auto text-[12.5px] font-semibold text-[#DC2626]">{message}</p>
        )}
      </div>
    </div>
  );
}
