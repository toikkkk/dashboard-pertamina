"use client";

// Panel Keamanan Akun (tab di Pengaturan): status verifikasi email dan autentikasi dua faktor (MFA, aplikasi authenticator). Aktivasi 2 langkah:
// (1) pindai QR / masukkan kunci manual, (2) masukkan kode 6 digit — lalu 8 kode pemulihan ditampilkan SEKALI.
// Menonaktifkan MFA butuh kata sandi + kode, jadi sesi yang dicuri saja tidak cukup.
import React, { useState } from "react";
import useSWR from "swr";
import { CheckCircle2, Copy, Download, KeyRound, Mail, ShieldAlert, ShieldCheck } from "lucide-react";

interface Status {
  mfaEnabled: boolean;
  mfaEnabledAt: string | null;
  recoveryCodesLeft: number;
  mfaAvailable: boolean;
  emailVerified: boolean;
  email: string;
}

async function post(url: string, body?: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((Array.isArray(data.issues) && data.issues[0]?.message) || data.error || "Permintaan gagal.");
  return data;
}

const card = "bg-white border border-[#D8E1E4] rounded-[14px] p-5";
const input = "w-full min-h-[40px] px-3 text-[13px] border border-[#C5CED3] rounded-[8px] bg-white focus:outline-none focus:border-[#0F3B59]";
const primary = "px-5 py-2 text-[13px] font-bold rounded-full bg-[#0F3B59] hover:bg-[#0B2C43] text-white disabled:opacity-50 transition-colors";

export default function AccountSecurityPanel() {
  const { data: status, mutate } = useSWR<Status>("/api/auth/mfa/status", (u: string) => fetch(u).then((r) => (r.ok ? r.json() : Promise.reject(new Error("gagal")))));
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [disabling, setDisabling] = useState(false);
  const [pw, setPw] = useState("");
  const [resent, setResent] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal.");
    } finally {
      setBusy(false);
    }
  };

  const startSetup = () => run(async () => { setSetup(await post("/api/auth/mfa/setup")); setCode(""); });
  const enable = () => run(async () => {
    const r = await post("/api/auth/mfa/enable", { code });
    setRecovery(r.recoveryCodes);
    setSetup(null);
    setCode("");
    await mutate();
  });
  const disable = () => run(async () => {
    await post("/api/auth/mfa/disable", { password: pw, code });
    setDisabling(false);
    setPw("");
    setCode("");
    await mutate();
  });
  const resend = () => run(async () => { const r = await post("/api/auth/resend-verification"); setResent(r.message ?? "Email verifikasi dikirim."); });

  const copyCodes = () => recovery && navigator.clipboard?.writeText(recovery.join("\n"));
  const downloadCodes = () => {
    if (!recovery) return;
    const blob = new Blob([`Kode pemulihan Portal PSI & MOC (${status?.email ?? ""})\nSetiap kode hanya berlaku sekali.\n\n${recovery.join("\n")}\n`], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kode-pemulihan-psi-moc.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="max-w-[640px]">

      <section className={`${card} mb-4`}>
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-[#0F3B59] mt-0.5" strokeWidth={1.8} />
          <div className="flex-1 min-w-0">
            <h2 className="text-[14px] font-bold text-[#0F172A]">Verifikasi email</h2>
            <p className="text-[12.5px] text-[#6b6e72] truncate">{status?.email ?? "…"}</p>
          </div>
          {status && (status.emailVerified ? (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#15803D]"><CheckCircle2 className="w-4 h-4" strokeWidth={2.2} /> Terverifikasi</span>
          ) : (
            <button type="button" disabled={busy} onClick={resend} className="text-[12.5px] font-bold text-[#0F3B59] hover:underline disabled:opacity-50">Kirim email verifikasi</button>
          ))}
        </div>
        {resent && <p className="mt-2 text-[12px] text-[#15663A]">{resent}</p>}
      </section>

      <section className={card}>
        <div className="flex items-start gap-3">
          {status?.mfaEnabled ? <ShieldCheck className="w-5 h-5 text-[#15803D] mt-0.5" strokeWidth={1.8} /> : <ShieldAlert className="w-5 h-5 text-[#B45309] mt-0.5" strokeWidth={1.8} />}
          <div className="flex-1 min-w-0">
            <h2 className="text-[14px] font-bold text-[#0F172A]">Autentikasi dua faktor (MFA)</h2>
            <p className="text-[12.5px] text-[#6b6e72]">
              {!status ? "Memuat…" : status.mfaEnabled ? `Aktif · ${status.recoveryCodesLeft} kode pemulihan tersisa` : "Belum aktif. Tambahkan lapisan kedua: kode dari aplikasi authenticator saat masuk."}
            </p>
          </div>
        </div>

        {error && <p role="alert" className="mt-3 text-[12px] font-semibold text-[#DC2626]">{error}</p>}

        {status && !status.mfaEnabled && !setup && !recovery && (
          <div className="mt-4">
            {status.mfaAvailable ? (
              <button type="button" onClick={startSetup} disabled={busy} className={primary}>Aktifkan MFA</button>
            ) : (
              <p className="text-[12.5px] text-[#B45309]">MFA belum bisa diaktifkan: kunci enkripsi server belum diatur oleh administrator sistem.</p>
            )}
          </div>
        )}

        {setup && (
          <div className="mt-4 flex flex-col sm:flex-row gap-5">
            <div className="flex-shrink-0 self-start border border-[#D8E1E4] rounded-[10px] p-2 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={setup.qr} alt="Kode QR untuk aplikasi authenticator" width={180} height={180} />
            </div>
            <div className="min-w-0 flex-1 flex flex-col gap-3">
              <ol className="text-[12.5px] text-[#3a3d40] leading-relaxed list-decimal pl-4">
                <li>Buka aplikasi authenticator (Google/Microsoft Authenticator, Authy, dll) lalu pindai kode QR.</li>
                <li>Tidak bisa memindai? Masukkan kunci ini secara manual:<br /><span className="font-mono text-[12px] break-all select-all">{setup.secret}</span></li>
                <li>Masukkan kode 6 digit yang tampil di aplikasi.</li>
              </ol>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label="Kode 6 digit"
                placeholder="123456"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && code.length === 6 && enable()}
                className={`${input} font-mono tracking-[.3em] text-center max-w-[180px]`}
              />
              <div className="flex gap-2">
                <button type="button" onClick={enable} disabled={busy || code.length !== 6} className={primary}>{busy ? "Memeriksa…" : "Aktifkan"}</button>
                <button type="button" onClick={() => { setSetup(null); setError(null); }} disabled={busy} className="px-4 py-2 text-[13px] font-bold text-[#0F3B59] rounded-full hover:bg-[#E2E8EB]">Batal</button>
              </div>
            </div>
          </div>
        )}

        {recovery && (
          <div className="mt-4 rounded-[10px] border border-[#BFE0CC] bg-[#EAF5EE] p-4">
            <p className="text-[13px] font-bold text-[#15663A] flex items-center gap-2"><KeyRound className="w-4 h-4" /> MFA aktif — simpan kode pemulihan ini sekarang</p>
            <p className="text-[12px] text-[#3a3d40] mt-1">Tiap kode hanya berlaku sekali dan <strong>tidak akan ditampilkan lagi</strong>. Gunakan bila ponsel hilang.</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 my-3 font-mono text-[13px] text-[#0F172A]">
              {recovery.map((c) => <span key={c} className="select-all">{c}</span>)}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copyCodes} className="inline-flex items-center gap-1.5 text-[12.5px] font-bold px-3 py-1.5 rounded-full border border-[#C5CED3] bg-white hover:bg-[#F0F4F6]"><Copy className="w-3.5 h-3.5" /> Salin</button>
              <button type="button" onClick={downloadCodes} className="inline-flex items-center gap-1.5 text-[12.5px] font-bold px-3 py-1.5 rounded-full border border-[#C5CED3] bg-white hover:bg-[#F0F4F6]"><Download className="w-3.5 h-3.5" /> Unduh</button>
              <button type="button" onClick={() => setRecovery(null)} className={`${primary} !py-1.5 ml-auto`}>Sudah saya simpan</button>
            </div>
          </div>
        )}

        {status?.mfaEnabled && !recovery && (
          <div className="mt-4">
            {!disabling ? (
              <button type="button" onClick={() => { setDisabling(true); setError(null); }} className="text-[12.5px] font-bold text-[#DC2626] hover:underline">Nonaktifkan MFA</button>
            ) : (
              <div className="flex flex-col gap-2.5 max-w-[320px]">
                <input type="password" autoComplete="current-password" aria-label="Kata sandi" placeholder="Kata sandi" value={pw} onChange={(e) => setPw(e.target.value)} className={input} />
                <input aria-label="Kode atau kode pemulihan" placeholder="Kode 6 digit / kode pemulihan" value={code} onChange={(e) => setCode(e.target.value)} className={input} />
                <div className="flex gap-2">
                  <button type="button" onClick={disable} disabled={busy || !pw || code.length < 6} className="px-5 py-2 text-[13px] font-bold rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white disabled:opacity-50">Nonaktifkan</button>
                  <button type="button" onClick={() => { setDisabling(false); setPw(""); setCode(""); setError(null); }} className="px-4 py-2 text-[13px] font-bold text-[#0F3B59] rounded-full hover:bg-[#E2E8EB]">Batal</button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
