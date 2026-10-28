"use client";

// Batas error halaman: tampil di dalam kerangka aplikasi (sidebar tetap ada) saat satu halaman gagal dirender,
// mis. jaringan putus di tengah memuat berkas skrip. Pesan dibedakan: tanpa internet vs. kesalahan lain.
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    console.error(error);
  }, [error]);

  const btn = "inline-flex items-center justify-center min-h-[40px] px-5 text-[13px] font-bold rounded-full transition-colors duration-150";

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div role="alert" className="w-full max-w-[460px] rounded-[14px] border border-[#C5CED3] bg-white px-7 py-8 text-center shadow-[0_12px_32px_-16px_rgba(15,23,42,.25)] animate-fadeInUp">
        <div className="mx-auto mb-4 h-[3px] w-10 rounded-full" style={{ background: offline ? "#B45309" : "#DC2626" }} aria-hidden />
        <h1 className="font-heading text-[19px] font-bold text-[#0F172A]">{offline ? "Koneksi internet terputus" : "Halaman ini belum bisa dimuat"}</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[#3a3d40]">
          {offline ? "Periksa jaringan Anda, lalu coba lagi. Data yang sudah tersimpan tidak hilang." : "Terjadi gangguan saat menampilkan halaman. Coba lagi, atau muat ulang halaman."}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={() => reset()} className={`${btn} bg-[#0F3B59] text-white hover:bg-[#0B2C43]`}>Coba lagi</button>
          <button type="button" onClick={() => window.location.reload()} className={`${btn} border border-[#C5CED3] bg-white text-[#0F3B59] hover:bg-[#E2E8EB]`}>Muat ulang</button>
          <Link href="/" className={`${btn} text-[#0F3B59] hover:bg-[#E2E8EB]`}>Ke Dashboard</Link>
        </div>
        {error.digest && <p className="mt-5 font-mono text-[11px] text-[#9a9da0]">Kode: {error.digest}</p>}
      </div>
    </div>
  );
}
