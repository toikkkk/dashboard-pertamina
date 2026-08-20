"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { usePsi } from "@/lib/psiStore";
import { deriveDemoEmail, SIMULATED_USERS } from "@/lib/mockData";
import { LogIn, Mail, Lock, User, Eye, EyeOff, UserPlus, CheckCircle2 } from "lucide-react";

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Must match scripts/seed-curated-documents.ts's DEMO_PASSWORD — every built-in demo
// account is seeded with this same password so the "Akun Demo Cepat" quick-fill
// below can log straight in.
const DEMO_PASSWORD = "Demo12345!";

const inputClass =
  "w-full pl-10 pr-3 py-2.5 rounded-[2px] border border-[#D6DEE8] focus:outline-none focus:border-[#0369A1] focus:ring-[3px] focus:ring-[#0369A1]/[.12] bg-[#F5F7F9] focus:bg-white text-[#0F172A] text-sm transition-all duration-200 ease-out-expo placeholder:text-[#9a9da0]";

const SignIn2 = () => {
  const router = useRouter();
  const { login, register } = usePsi();

  const [mode, setMode] = useState<"signin" | "register">("signin");

  // Sign in
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  // Register
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState(false);
  const [registering, setRegistering] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      setError("Mohon isi email dan kata sandi.");
      return;
    }
    if (!validateEmail(email)) {
      setError("Format email tidak valid.");
      return;
    }
    setError("");
    setSigningIn(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk.");
    } finally {
      setSigningIn(false);
    }
  };

  const handleRegister = async () => {
    if (!regName.trim() || !regEmail || !regPassword) {
      setRegError("Semua kolom wajib diisi.");
      return;
    }
    if (!validateEmail(regEmail)) {
      setRegError("Format email tidak valid.");
      return;
    }
    if (regPassword.length < 8) {
      setRegError("Kata sandi minimal 8 karakter.");
      return;
    }
    setRegError("");
    setRegistering(true);
    try {
      await register(regName.trim(), regEmail, regPassword);
      setRegSuccess(true);
      setTimeout(() => router.push("/"), 1600);
    } catch (err) {
      setRegError(err instanceof Error ? err.message : "Gagal mendaftar.");
    } finally {
      setRegistering(false);
    }
  };

  const quickFill = (name: string) => {
    setEmail(deriveDemoEmail(name));
    setPassword(DEMO_PASSWORD);
    setError("");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#E9EEF3] p-6">
      <div className="w-full max-w-sm bg-white rounded-[4px] shadow-[0_20px_60px_rgba(15,23,42,.12)] p-8 flex flex-col items-center border border-[#D6DEE8]">
        <div className="flex items-center justify-center w-14 h-14 rounded-[4px] bg-[#0369A1] mb-6">
          {mode === "signin" ? (
            <LogIn className="w-6 h-6 text-white" strokeWidth={2} />
          ) : (
            <UserPlus className="w-6 h-6 text-white" strokeWidth={2} />
          )}
        </div>

        <h2 className="font-heading text-xl font-bold mb-1.5 text-center text-[#0F172A]">
          {mode === "signin" ? "Masuk ke Portal PSI & MOC" : "Daftar Akun Baru"}
        </h2>
        <p className="text-[#6b6e72] text-[12.5px] mb-6 text-center leading-relaxed">
          {mode === "signin"
            ? "Regional Jatimbalinus — kelola dokumen Process Safety Information & Management of Change."
            : "Akun akan dibuat, tapi belum bisa mengakses apa pun sampai Admin Regional menetapkan lokasi & peran Anda."}
        </p>

        {/* Mode switch */}
        <div className="w-full flex bg-[#F5F7F9] border border-[#eceded] rounded-[2px] p-1 mb-5">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex-1 text-[12.5px] font-bold py-1.5 rounded-[2px] transition-all duration-200 ${
              mode === "signin" ? "bg-white text-[#0369A1] shadow-[0_1px_2px_rgba(15,23,42,.08)]" : "text-[#6b6e72] hover:text-[#0F172A]"
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 text-[12.5px] font-bold py-1.5 rounded-[2px] transition-all duration-200 ${
              mode === "register" ? "bg-white text-[#0369A1] shadow-[0_1px_2px_rgba(15,23,42,.08)]" : "text-[#6b6e72] hover:text-[#0F172A]"
            }`}
          >
            Daftar
          </button>
        </div>

        {mode === "signin" ? (
          <>
            <div className="w-full flex flex-col gap-3 mb-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9da0]">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  placeholder="Email"
                  type="email"
                  value={email}
                  className={inputClass}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9da0]">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  placeholder="Kata Sandi"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9da0] hover:text-[#0F172A] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && <div className="text-[11.5px] text-[#DC2626] font-medium">{error}</div>}
            </div>

            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="w-full bg-[#0369A1] hover:bg-[#075985] text-white font-heading font-bold text-[14.5px] py-2.5 rounded-[2px] active:scale-[0.98] transition-all duration-200 ease-out-expo mb-5 mt-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {signingIn ? "Memproses…" : "Masuk"}
            </button>

            <div className="flex items-center w-full mb-3">
              <div className="flex-grow border-t border-dashed border-[#e2e5e9]" />
              <span className="mx-2.5 text-[10.5px] font-semibold text-[#9a9da0] uppercase tracking-wide">Akun demo cepat</span>
              <div className="flex-grow border-t border-dashed border-[#e2e5e9]" />
            </div>
            <div className="w-full flex flex-col gap-1.5">
              {SIMULATED_USERS.slice(0, 4).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => quickFill(u.name)}
                  className="w-full flex items-center justify-between text-left px-3 py-2 rounded-[2px] border border-[#eceded] hover:border-[#0369A1] hover:bg-[#F5F7F9] transition-all duration-200"
                >
                  <span className="text-[12px] font-semibold text-[#0F172A]">{u.name}</span>
                  <span className="text-[10.5px] text-[#9a9da0]">{u.role}</span>
                </button>
              ))}
            </div>
          </>
        ) : regSuccess ? (
          <div className="w-full flex flex-col items-center text-center gap-2.5 py-4 animate-fadeInUp">
            <CheckCircle2 className="w-9 h-9 text-[#15803D]" strokeWidth={1.7} />
            <p className="text-[13px] font-bold text-[#0F172A]">Akun berhasil dibuat</p>
            <p className="text-[12px] text-[#6b6e72] leading-relaxed">
              Menunggu Admin Regional menetapkan lokasi &amp; peran Anda sebelum bisa mengakses data. Mengalihkan…
            </p>
          </div>
        ) : (
          <>
            <div className="w-full flex flex-col gap-3 mb-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9da0]">
                  <User className="w-4 h-4" />
                </span>
                <input
                  placeholder="Nama Lengkap"
                  type="text"
                  value={regName}
                  className={inputClass}
                  onChange={(e) => {
                    setRegName(e.target.value);
                    setRegError("");
                  }}
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9da0]">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  placeholder="Email @pertamina.com"
                  type="email"
                  value={regEmail}
                  className={inputClass}
                  onChange={(e) => {
                    setRegEmail(e.target.value);
                    setRegError("");
                  }}
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9da0]">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  placeholder="Kata Sandi"
                  type="password"
                  value={regPassword}
                  className={inputClass}
                  onChange={(e) => {
                    setRegPassword(e.target.value);
                    setRegError("");
                  }}
                />
              </div>
              {regError && <div className="text-[11.5px] text-[#DC2626] font-medium">{regError}</div>}
            </div>

            <button
              onClick={handleRegister}
              disabled={registering}
              className="w-full bg-[#0369A1] hover:bg-[#075985] text-white font-heading font-bold text-[14.5px] py-2.5 rounded-[2px] active:scale-[0.98] transition-all duration-200 ease-out-expo mt-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {registering ? "Memproses…" : "Daftar"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export { SignIn2 };
