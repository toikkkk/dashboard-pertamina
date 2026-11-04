"use client";

// Layar wajib ganti kata sandi awal (akun sungguhan). AuthGuard mengalihkan akun bertanda mustChangePassword ke sini.
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { PASSWORD_REQUIREMENTS } from "@/lib/domain/rules";
import { usePsi } from "@/lib/psiStore";

const INPUT = "w-full min-h-[40px] px-3 py-2 text-[14px] border border-[#C5CED3] rounded-[8px] bg-white focus:outline-none focus:border-[#0F3B59]";

export default function GantiSandiPage() {
  const router = useRouter();
  const { activeUser, logout } = usePsi();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const met = PASSWORD_REQUIREMENTS.map((r) => ({ label: r.label, ok: r.met(next) }));
  const ready = !!current && met.every((m) => m.ok) && next === confirm && next !== current;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error ?? "Gagal mengganti kata sandi.");
      await mutate("/api/bootstrap");
      router.replace("/");
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Gagal mengganti kata sandi.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#CAD4DA] px-4">
      <form onSubmit={submit} className="w-full max-w-[420px] bg-white rounded-[14px] border border-[#C5CED3] p-8 shadow-[0_12px_40px_-12px_rgba(15,23,42,.25)]">
        <div className="text-[10.5px] font-bold uppercase tracking-[.14em] text-[#6b7780]">PSIOneVision</div>
        <h1 className="font-heading text-[20px] font-bold text-[#0F172A] mt-2">Ganti kata sandi Anda</h1>
        <p className="text-[13px] text-[#4b5560] mt-1">Halo {activeUser.name}. Ganti kata sandi awal sebelum memakai portal.</p>

        <label className="block mt-5 text-[13px] font-bold text-[#0F172A]">Kata sandi saat ini</label>
        <input type="password" autoComplete="current-password" className={`${INPUT} mt-1`} value={current} onChange={(e) => setCurrent(e.target.value)} />

        <label className="block mt-4 text-[13px] font-bold text-[#0F172A]">Kata sandi baru</label>
        <input type="password" autoComplete="new-password" className={`${INPUT} mt-1`} value={next} onChange={(e) => setNext(e.target.value)} />
        <ul className="mt-2 flex flex-col gap-0.5">
          {met.map((m) => (
            <li key={m.label} className="text-[12px] font-semibold" style={{ color: m.ok ? "#15803D" : "#6b6e72" }}>
              {m.ok ? "✓" : "○"} {m.label}
            </li>
          ))}
        </ul>

        <label className="block mt-4 text-[13px] font-bold text-[#0F172A]">Ulangi kata sandi baru</label>
        <input type="password" autoComplete="new-password" className={`${INPUT} mt-1`} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        {confirm && next !== confirm && <p className="text-[12px] text-[#DC2626] mt-1">Kata sandi tidak sama.</p>}
        {next && next === current && <p className="text-[12px] text-[#DC2626] mt-1">Kata sandi baru harus berbeda dari yang lama.</p>}

        {error && <p role="alert" className="text-[13px] font-semibold text-[#DC2626] mt-3">{error}</p>}

        <button type="submit" disabled={!ready || busy} className="w-full mt-5 px-5 py-2.5 rounded-full bg-[#0F3B59] hover:bg-[#0B2C43] text-white text-[14px] font-bold disabled:opacity-50 disabled:cursor-not-allowed">
          {busy ? "Menyimpan…" : "Simpan kata sandi"}
        </button>
        <button type="button" onClick={() => logout()} className="w-full mt-2 px-5 py-2 text-[13px] font-bold text-[#0F172A] hover:underline">
          Keluar
        </button>
      </form>
    </div>
  );
}
