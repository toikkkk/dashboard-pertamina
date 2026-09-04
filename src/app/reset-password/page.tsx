"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePsi } from "@/lib/psiStore";
import { passwordPolicyIssues } from "@/lib/mockData";
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertTriangle } from "lucide-react";
import PasswordChecklist from "@/components/PasswordChecklist";

const inputClass =
  "w-full pl-10 pr-3 py-2.5 rounded-[8px] border border-[#D6DEE8] focus:outline-none focus:border-[#0369A1] focus:ring-[3px] focus:ring-[#0369A1]/[.12] bg-[#F5F7F9] focus:bg-white text-[#0F172A] text-sm transition-all duration-200 ease-out-expo placeholder:text-[#9a9da0]";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetPassword } = usePsi();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    const issues = passwordPolicyIssues(password);
    if (issues.length > 0) {
      setError(`Kata sandi belum memenuhi syarat: ${issues.join(", ")}.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await resetPassword(token ?? "", password);
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengatur ulang kata sandi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#E9EEF3] p-6">
      <div className="w-full max-w-sm bg-white rounded-[14px] shadow-[0_20px_60px_rgba(15,23,42,.12)] p-8 flex flex-col items-center border border-[#D6DEE8] animate-fadeInUp">
        <div className="flex items-center justify-center w-14 h-14 rounded-[14px] bg-[#0369A1] mb-6 animate-popIn" style={{ animationDelay: "80ms" }}>
          <KeyRound className="w-6 h-6 text-white" strokeWidth={2} />
        </div>

        <h2 className="font-heading text-xl font-bold mb-1.5 text-center text-[#0F172A]">Buat Kata Sandi Baru</h2>

        {!token ? (
          <div className="w-full flex flex-col items-center text-center gap-2.5 py-4">
            <AlertTriangle className="w-9 h-9 text-[#DC2626]" strokeWidth={1.7} />
            <p className="text-[13px] font-bold text-[#0F172A]">Tautan tidak valid</p>
            <p className="text-[12px] text-[#6b6e72] leading-relaxed">
              Buka tautan ini langsung dari email atur ulang kata sandi yang Anda terima.
            </p>
          </div>
        ) : done ? (
          <div className="w-full flex flex-col items-center text-center gap-2.5 py-4 animate-fadeInUp">
            <CheckCircle2 className="w-9 h-9 text-[#15803D] animate-popIn" strokeWidth={1.7} />
            <p className="text-[13px] font-bold text-[#0F172A]">Kata sandi berhasil diperbarui</p>
            <p className="text-[12px] text-[#6b6e72] leading-relaxed">Mengalihkan ke halaman masuk…</p>
          </div>
        ) : (
          <>
            <p className="text-[#6b6e72] text-[12.5px] mb-6 text-center leading-relaxed">
              Masukkan kata sandi baru untuk akun Anda.
            </p>
            <div className="w-full flex flex-col gap-3 mb-2">
              <div className="relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9da0] transition-colors duration-200 group-focus-within:text-[#0369A1]">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  placeholder="Kata Sandi Baru"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  className={`${inputClass} pr-10`}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9da0] hover:text-[#0F172A] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9da0] transition-colors duration-200 group-focus-within:text-[#0369A1]">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  placeholder="Ulangi Kata Sandi Baru"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  className={inputClass}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError("");
                  }}
                />
              </div>
              <PasswordChecklist password={password} />
              {error && <div className="text-[11.5px] text-[#DC2626] font-medium animate-fadeIn">{error}</div>}
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-[#0369A1] hover:bg-[#075985] text-white font-heading font-bold text-[14.5px] py-2.5 rounded-[8px] active:scale-[0.98] transition-all duration-200 ease-out-expo mt-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {submitting ? "Menyimpan…" : "Simpan Kata Sandi Baru"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#E9EEF3]" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
