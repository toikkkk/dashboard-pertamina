"use client";

// Tujuan tautan di email verifikasi: /verifikasi-email?token=… — menukar token lewat API lalu menampilkan hasilnya.
import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";

function Verify() {
  const token = useSearchParams().get("token");
  const [state, setState] = useState<"proses" | "ok" | "gagal">("proses");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setState("gagal");
      setMsg("Tautan tidak lengkap.");
      return;
    }
    fetch("/api/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        setState(r.ok ? "ok" : "gagal");
        setMsg(r.ok ? b.message : b.error || "Verifikasi gagal.");
      })
      .catch(() => { setState("gagal"); setMsg("Tidak dapat menghubungi server."); });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#CAD4DA] px-4">
      <div className="w-full max-w-[400px] bg-white rounded-[14px] border border-[#C5CED3] p-8 text-center shadow-[0_12px_40px_-12px_rgba(15,23,42,.25)]">
        <div className="text-[10.5px] font-bold uppercase tracking-[.14em] text-[#6b7780]">PSIOneVision</div>
        {state === "proses" && <p className="mt-6 text-[13.5px] text-[#4b5560]">Memverifikasi email Anda…</p>}
        {state === "ok" && (
          <>
            <CheckCircle2 className="w-11 h-11 text-[#15803D] mx-auto mt-5" strokeWidth={1.6} />
            <h1 className="font-heading text-[20px] font-bold text-[#0F172A] mt-3">Email terverifikasi</h1>
            <p className="text-[13px] text-[#4b5560] mt-1">{msg}</p>
          </>
        )}
        {state === "gagal" && (
          <>
            <XCircle className="w-11 h-11 text-[#DC2626] mx-auto mt-5" strokeWidth={1.6} />
            <h1 className="font-heading text-[20px] font-bold text-[#0F172A] mt-3">Verifikasi gagal</h1>
            <p className="text-[13px] text-[#4b5560] mt-1">{msg}</p>
          </>
        )}
        <Link href="/login" className="inline-block mt-6 px-5 py-2 rounded-full bg-[#0F3B59] hover:bg-[#0B2C43] text-white text-[13px] font-bold">Ke halaman masuk</Link>
      </div>
    </div>
  );
}

export default function VerifikasiEmailPage() {
  return (
    <Suspense fallback={null}>
      <Verify />
    </Suspense>
  );
}
