"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePsi } from "@/lib/psiStore";
import { passwordPolicyIssues } from "@/lib/mockData";
import { LogIn, Mail, Lock, User, Eye, EyeOff, UserPlus, CheckCircle2, KeyRound, ArrowLeft } from "lucide-react";
import PasswordChecklist from "@/components/PasswordChecklist";

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const inputClass =
  "w-full pl-10 pr-3 py-2.5 rounded-[2px] border border-[#D6DEE8] focus:outline-none focus:border-[#0369A1] focus:ring-[3px] focus:ring-[#0369A1]/[.12] bg-[#F5F7F9] focus:bg-white text-[#0F172A] text-sm transition-all duration-200 ease-out-expo placeholder:text-[#9a9da0]";

// Icon wrapper reacts to the sibling input's focus via `group-focus-within` — a
// small, deliberate detail (icon picks up brand blue while its field is active)
// rather than a static gray icon regardless of state.
function FieldIcon({ children }: { children: React.ReactNode }) {
  return <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9da0] transition-colors duration-200 group-focus-within:text-[#0369A1]">{children}</span>;
}

// Official 4-color "G" mark — Google's brand guidelines require the real logo, not a
// generic icon-font substitute, for any "Sign in with Google" control.
function GoogleLogo() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.5C29.4 34.9 26.8 36 24 36c-5.3 0-9.6-3.1-11.3-7.6l-6.5 5C9.6 39.6 16.3 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.5 5.5C40.9 36.6 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

function SignIn2Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register, forgotPassword } = usePsi();

  const [mode, setMode] = useState<"signin" | "register" | "forgot">("signin");

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [sendingForgot, setSendingForgot] = useState(false);

  // Sign in
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  // Surfaces a failure from the Google OAuth round trip (see
  // /api/auth/google/callback, which redirects here with ?googleError=... instead of
  // throwing — there's no client-side call to catch an error from, it's a full page
  // redirect the whole way).
  useEffect(() => {
    const googleError = searchParams.get("googleError");
    if (googleError) setError(googleError);
  }, [searchParams]);

  // Register
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
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
    const issues = passwordPolicyIssues(regPassword);
    if (issues.length > 0) {
      setRegError(`Kata sandi belum memenuhi syarat: ${issues.join(", ")}.`);
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

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      setForgotError("Mohon isi email Anda.");
      return;
    }
    if (!validateEmail(forgotEmail)) {
      setForgotError("Format email tidak valid.");
      return;
    }
    setForgotError("");
    setSendingForgot(true);
    try {
      await forgotPassword(forgotEmail);
      setForgotSent(true);
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "Gagal mengirim tautan atur ulang.");
    } finally {
      setSendingForgot(false);
    }
  };

  const backToSignIn = () => {
    setMode("signin");
    setForgotEmail("");
    setForgotError("");
    setForgotSent(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#E9EEF3] p-6">
      <div className="w-full max-w-sm bg-white rounded-[4px] shadow-[0_20px_60px_rgba(15,23,42,.12)] p-8 flex flex-col items-center border border-[#D6DEE8] animate-fadeInUp">
        <div
          className="flex items-center justify-center w-14 h-14 rounded-[4px] bg-[#0369A1] mb-6 animate-popIn"
          style={{ animationDelay: "80ms" }}
        >
          {mode === "signin" ? (
            <LogIn className="w-6 h-6 text-white" strokeWidth={2} />
          ) : mode === "register" ? (
            <UserPlus className="w-6 h-6 text-white" strokeWidth={2} />
          ) : (
            <KeyRound className="w-6 h-6 text-white" strokeWidth={2} />
          )}
        </div>

        <h2 className="font-heading text-xl font-bold mb-1.5 text-center text-[#0F172A]">
          {mode === "signin" ? "Masuk ke Portal PSI & MOC" : mode === "register" ? "Daftar Akun Baru" : "Atur Ulang Kata Sandi"}
        </h2>
        <p className="text-[#6b6e72] text-[12.5px] mb-6 text-center leading-relaxed">
          {mode === "signin"
            ? "Regional Jatimbalinus — kelola dokumen Process Safety Information & Management of Change."
            : mode === "register"
            ? "Akun akan dibuat, tapi belum bisa mengakses apa pun sampai Admin Regional menetapkan lokasi & peran Anda."
            : "Masukkan email akun Anda — kami kirimkan tautan untuk membuat kata sandi baru."}
        </p>

        {mode === "forgot" ? (
          <button
            type="button"
            onClick={backToSignIn}
            className="w-full flex items-center gap-1.5 text-[12.5px] font-bold text-[#0369A1] hover:text-[#075985] mb-5 transition-colors duration-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.2} />
            Kembali ke Masuk
          </button>
        ) : (
          /* Mode switch — sliding pill indicator instead of a hard cut between tabs */
          <div className="relative w-full flex bg-[#F5F7F9] border border-[#eceded] rounded-[2px] p-1 mb-5">
            <div
              className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-white rounded-[2px] shadow-[0_1px_2px_rgba(15,23,42,.08)] transition-transform duration-300 ease-out-expo"
              style={{ transform: mode === "register" ? "translateX(calc(100%+4px))" : "translateX(0)" }}
            />
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`relative z-10 flex-1 text-[12.5px] font-bold py-1.5 rounded-[2px] transition-colors duration-200 ${
                mode === "signin" ? "text-[#0369A1]" : "text-[#6b6e72] hover:text-[#0F172A]"
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`relative z-10 flex-1 text-[12.5px] font-bold py-1.5 rounded-[2px] transition-colors duration-200 ${
                mode === "register" ? "text-[#0369A1]" : "text-[#6b6e72] hover:text-[#0F172A]"
              }`}
            >
              Daftar
            </button>
          </div>
        )}

        {mode === "signin" ? (
          <>
            <div className="w-full flex flex-col gap-3 mb-2">
              <div className="relative group">
                <FieldIcon>
                  <Mail className="w-4 h-4" />
                </FieldIcon>
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
              <div className="relative group">
                <FieldIcon>
                  <Lock className="w-4 h-4" />
                </FieldIcon>
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
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9da0] hover:text-[#0F172A] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="self-end text-[11.5px] font-bold text-[#0369A1] hover:text-[#075985] transition-colors duration-200 -mt-1.5"
              >
                Lupa kata sandi?
              </button>
              {error && <div className="text-[11.5px] text-[#DC2626] font-medium animate-fadeIn">{error}</div>}
            </div>

            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="w-full bg-[#0369A1] hover:bg-[#075985] text-white font-heading font-bold text-[14.5px] py-2.5 rounded-[2px] active:scale-[0.98] transition-all duration-200 ease-out-expo mb-5 mt-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {signingIn ? "Memproses…" : "Masuk"}
            </button>

            <div className="flex items-center w-full mb-4">
              <div className="flex-grow border-t border-dashed border-[#e2e5e9]" />
              <span className="mx-2.5 text-[10.5px] font-semibold text-[#9a9da0] uppercase tracking-wide">atau</span>
              <div className="flex-grow border-t border-dashed border-[#e2e5e9]" />
            </div>

            <a
              href="/api/auth/google"
              className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-[#F5F7F9] text-[#3a3d40] font-semibold text-[13px] py-2.5 rounded-[2px] border border-[#D6DEE8] active:scale-[0.98] transition-all duration-200 ease-out-expo"
            >
              <GoogleLogo />
              Masuk dengan Google
            </a>
          </>
        ) : mode === "forgot" ? (
          forgotSent ? (
            <div className="w-full flex flex-col items-center text-center gap-2.5 py-4 animate-fadeInUp">
              <CheckCircle2 className="w-9 h-9 text-[#15803D] animate-popIn" strokeWidth={1.7} />
              <p className="text-[13px] font-bold text-[#0F172A]">Tautan terkirim</p>
              <p className="text-[12px] text-[#6b6e72] leading-relaxed">
                Kalau <strong>{forgotEmail}</strong> terdaftar, kami sudah mengirimkan tautan atur ulang kata sandi ke email tersebut. Berlaku 30 menit.
              </p>
            </div>
          ) : (
            <>
              <div className="w-full flex flex-col gap-3 mb-2">
                <div className="relative group">
                  <FieldIcon>
                    <Mail className="w-4 h-4" />
                  </FieldIcon>
                  <input
                    placeholder="Email"
                    type="email"
                    value={forgotEmail}
                    className={inputClass}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      setForgotError("");
                    }}
                  />
                </div>
                {forgotError && <div className="text-[11.5px] text-[#DC2626] font-medium animate-fadeIn">{forgotError}</div>}
              </div>
              <button
                onClick={handleForgotPassword}
                disabled={sendingForgot}
                className="w-full bg-[#0369A1] hover:bg-[#075985] text-white font-heading font-bold text-[14.5px] py-2.5 rounded-[2px] active:scale-[0.98] transition-all duration-200 ease-out-expo mt-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {sendingForgot ? "Mengirim…" : "Kirim Tautan Atur Ulang"}
              </button>
            </>
          )
        ) : regSuccess ? (
          <div className="w-full flex flex-col items-center text-center gap-2.5 py-4 animate-fadeInUp">
            <CheckCircle2 className="w-9 h-9 text-[#15803D] animate-popIn" strokeWidth={1.7} />
            <p className="text-[13px] font-bold text-[#0F172A]">Akun berhasil dibuat</p>
            <p className="text-[12px] text-[#6b6e72] leading-relaxed">
              Menunggu Admin Regional menetapkan lokasi &amp; peran Anda sebelum bisa mengakses data. Mengalihkan…
            </p>
          </div>
        ) : (
          <>
            <div className="w-full flex flex-col gap-3 mb-2">
              <div className="relative group">
                <FieldIcon>
                  <User className="w-4 h-4" />
                </FieldIcon>
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
              <div className="relative group">
                <FieldIcon>
                  <Mail className="w-4 h-4" />
                </FieldIcon>
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
              <div className="relative group">
                <FieldIcon>
                  <Lock className="w-4 h-4" />
                </FieldIcon>
                <input
                  placeholder="Kata Sandi"
                  type={showRegPassword ? "text" : "password"}
                  value={regPassword}
                  className={`${inputClass} pr-10`}
                  onChange={(e) => {
                    setRegPassword(e.target.value);
                    setRegError("");
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword((v) => !v)}
                  aria-label={showRegPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9da0] hover:text-[#0F172A] transition-colors"
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordChecklist password={regPassword} />
              {regError && <div className="text-[11.5px] text-[#DC2626] font-medium animate-fadeIn">{regError}</div>}
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
}

function SignIn2() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#E9EEF3]" />}>
      <SignIn2Content />
    </Suspense>
  );
}

export { SignIn2 };
