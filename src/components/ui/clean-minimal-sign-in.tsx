"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { usePsi } from "@/lib/psiStore";
import { passwordPolicyIssues } from "@/lib/mockData";
import { Mail, Lock, User, AtSign, Eye, EyeOff, CheckCircle2, ArrowLeft } from "lucide-react";
import PasswordChecklist from "@/components/PasswordChecklist";
import { ENTER_FLAG } from "@/lib/localPref";

gsap.registerPlugin(useGSAP);

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
// Username: sama dengan aturan server (lib/auth/username.ts), tanpa membedakan huruf besar/kecil.
const validateUsername = (u: string) => /^[a-z0-9._-]{3,30}$/i.test(u);

// Pengenal masuk: ada "@" = email, selain itu username.
function identifierIssue(v: string): string | null {
  if (!v.trim()) return "Mohon isi email atau username.";
  if (v.includes("@")) return validateEmail(v.trim()) ? null : "Format email tidak valid.";
  return validateUsername(v.trim()) ? null : "Username 3-30 karakter: huruf, angka, titik, garis bawah, atau strip.";
}

const inputClass =
  "w-full pl-10 pr-3 py-2.5 rounded-[8px] border border-transparent bg-[#EEF2F4] focus:outline-none focus:border-[#0F3B59] focus:bg-white focus:ring-[3px] focus:ring-[#0F3B59]/[.12] text-[#0F172A] text-sm transition-all duration-200 ease-out-expo placeholder:text-[#6b7780]";
const primaryBtn =
  "w-full bg-[#0F3B59] hover:bg-[#0B2C43] text-white font-heading font-bold text-[14px] tracking-wide py-2.5 rounded-[8px] active:scale-[0.98] transition-all duration-200 ease-out-expo disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100";

// Ikon di dalam kolom berubah biru saat kolomnya aktif (group-focus-within).
function FieldIcon({ children }: { children: React.ReactNode }) {
  return <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7780] transition-colors duration-200 group-focus-within:text-[#0F3B59]">{children}</span>;
}

// Logo "G" resmi 4 warna — pedoman Google mewajibkan logo asli untuk kontrol "Masuk dengan Google".
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

  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [forgot, setForgot] = useState(false);

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [sendingForgot, setSendingForgot] = useState(false);

  // Sign in
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [signInSuccess, setSignInSuccess] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Galat dari putaran OAuth Google (/api/auth/google/callback mengarahkan ke sini dengan
  // ?googleError=...; tidak ada panggilan klien yang bisa di-catch, semuanya redirect).
  useEffect(() => {
    const googleError = searchParams.get("googleError");
    if (googleError) setError(googleError);
  }, [searchParams]);

  // Register
  const [regName, setRegName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // Pesan sukses yang ditampilkan panel biru setelah melebar ke seluruh kartu.
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleSignIn = async () => {
    const issue = identifierIssue(identifier);
    if (issue) {
      setError(issue);
      return;
    }
    if (!password) {
      setError("Mohon isi kata sandi.");
      return;
    }
    setError("");
    setSigningIn(true);
    try {
      await login(identifier.trim(), password);
      setSignInSuccess(true);
      setSuccessMsg("Login berhasil");
      setLeaving(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk.");
      setSigningIn(false);
    }
  };

  // Urutan sesudah berhasil (layar lebar): panel biru meluas ke tengah menutup seluruh
  // kartu, centang + pesan sukses muncul di dalamnya, jeda sebentar, lalu kartu meluncur
  // ke ATAS dan pudar; dashboard masuk dari bawah (lihat AppShell). Navigasi baru terjadi
  // sesudah gerak selesai. Ponsel (tanpa panel geser): centang di dalam panel form lalu
  // meluncur. Reduced-motion: jeda singkat tanpa gerak.
  useGSAP(
    () => {
      if (!leaving) return;
      const go = () => {
        try { window.sessionStorage.setItem(ENTER_FLAG, "1"); } catch { /* tidak masalah */ }
        router.push("/");
      };
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ onComplete: go });
        const overlay = overlayRef.current;
        const card = cardRef.current;
        if (overlay && card && window.matchMedia("(min-width: 768px)").matches) {
          const c = card.getBoundingClientRect();
          const o = overlay.getBoundingClientRect();
          // Lepas transform/transisi CSS supaya GSAP memegang posisi sepenuhnya.
          gsap.set(overlay, { transition: "none", transform: "none", left: o.left - c.left, width: o.width });
          tl.to(overlay, { left: 0, width: c.width, duration: 0.85, ease: "power3.inOut" });
          tl.fromTo(".login-ok", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, "-=0.4");
          tl.fromTo(".login-ok-ring", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.6, ease: "power2.inOut" }, "<");
          tl.fromTo(".login-ok-check", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.4, ease: "power2.out" }, "-=0.2");
          tl.to({}, { duration: 0.75 });
        } else {
          tl.to({}, { duration: 0.6 });
        }
        tl.to(card, { yPercent: -125, opacity: 0, duration: 0.7, ease: "power3.in" });
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.delayedCall(0.7, go);
      });
      return () => mm.revert();
    },
    { dependencies: [leaving] }
  );

  const handleRegister = async () => {
    if (!regName.trim() || !regUsername || !regEmail || !regPassword) {
      setRegError("Semua kolom wajib diisi.");
      return;
    }
    if (!validateUsername(regUsername.trim())) {
      setRegError("Username 3-30 karakter: huruf, angka, titik, garis bawah, atau strip.");
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
      await register(regName.trim(), regEmail, regPassword, regUsername.trim().toLowerCase());
      setRegSuccess(true);
      setSuccessMsg("Akun berhasil dibuat");
      setLeaving(true);
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
    setForgot(false);
    setForgotEmail("");
    setForgotError("");
    setForgotSent(false);
  };

  const goMode = (m: "signin" | "register") => {
    setMode(m);
    if (m === "register") backToSignIn();
  };

  const isSignin = mode === "signin";
  // Panel tidak aktif disembunyikan (tidak bisa difokus/diklik) tapi tetap ikut
  // menentukan tinggi kartu di ponsel, tempat kedua panel bertumpuk.
  const panel = (active: boolean, dir: "l" | "r") =>
    `col-start-1 row-start-1 flex flex-col justify-center px-7 py-9 sm:px-10 transition-all duration-500 ease-out-expo ${
      dir === "r" ? "md:col-start-2" : ""
    } ${
      active
        ? "opacity-100 translate-x-0 z-[2] delay-150"
        : `opacity-0 pointer-events-none invisible ${dir === "l" ? "md:-translate-x-6" : "md:translate-x-6"} z-[1]`
    }`;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white p-4 sm:p-6 overflow-hidden">
      <div className="w-full max-w-[920px] animate-fadeInUp">
      <div
        ref={cardRef}
        className="relative w-full min-h-[600px] bg-white rounded-[20px] shadow-[0_40px_80px_-24px_rgba(15,59,89,.38),0_16px_32px_-16px_rgba(15,23,42,.22),0_0_0_1px_rgba(15,23,42,.05)] overflow-hidden grid grid-cols-1 md:grid-cols-2"
      >
        {/* ---------- Masuk ---------- */}
        <div className={panel(isSignin, "l")} aria-hidden={!isSignin}>
          <div className="w-full max-w-[330px] mx-auto">
            <div className="text-center mb-7">
              <div className="text-[10.5px] font-bold uppercase tracking-[.14em] text-[#6b7780]">Portal PSI &amp; MOC</div>
              <h1 className="font-heading text-[32px] font-bold text-[#0F172A] mt-2 leading-tight">{forgot ? "Atur Ulang Sandi" : "Masuk"}</h1>
            </div>

            {signInSuccess ? (
              <div className="flex flex-col items-center text-center gap-2.5 py-8 animate-fadeInUp">
                <CheckCircle2 className="w-10 h-10 text-[#15803D] animate-popIn" strokeWidth={1.7} />
                <p className="text-[13.5px] font-bold text-[#0F172A]">Berhasil masuk</p>
              </div>
            ) : forgot ? (
              forgotSent ? (
                <div className="flex flex-col items-center text-center gap-2.5 py-4 animate-fadeInUp">
                  <CheckCircle2 className="w-9 h-9 text-[#15803D] animate-popIn" strokeWidth={1.7} />
                  <p className="text-[13px] font-bold text-[#0F172A]">Tautan terkirim</p>
                  <p className="text-[12px] text-[#4b5560] leading-relaxed">
                    Kalau <strong>{forgotEmail}</strong> terdaftar, tautan atur ulang kata sandi sudah dikirim ke email tersebut. Berlaku 30 menit.
                  </p>
                  <button type="button" onClick={backToSignIn} className="text-[12.5px] font-bold text-[#0F3B59] hover:underline mt-1">Kembali ke Masuk</button>
                </div>
              ) : (
                <>
                  <button type="button" onClick={backToSignIn} className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#0F3B59] hover:text-[#0B2C43] mb-4 transition-colors duration-200">
                    <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.2} /> Kembali ke Masuk
                  </button>
                  <div className="flex flex-col gap-3 mb-3">
                    <div className="relative group">
                      <FieldIcon><Mail className="w-4 h-4" /></FieldIcon>
                      <input
                        placeholder="Email"
                        type="email"
                        value={forgotEmail}
                        className={inputClass}
                        onChange={(e) => { setForgotEmail(e.target.value); setForgotError(""); }}
                        onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()}
                      />
                    </div>
                    {forgotError && <div className="text-[11.5px] text-[#DC2626] font-medium animate-fadeIn">{forgotError}</div>}
                  </div>
                  <button onClick={handleForgotPassword} disabled={sendingForgot} className={primaryBtn}>
                    {sendingForgot ? "Mengirim…" : "KIRIM TAUTAN"}
                  </button>
                </>
              )
            ) : (
              <>
                <div className="flex flex-col gap-3 mb-2">
                  <div className="relative group">
                    <FieldIcon><AtSign className="w-4 h-4" /></FieldIcon>
                    <input
                      placeholder="Email atau username"
                      type="text"
                      autoComplete="username"
                      value={identifier}
                      className={inputClass}
                      onChange={(e) => { setIdentifier(e.target.value); setError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                    />
                  </div>
                  <div className="relative group">
                    <FieldIcon><Lock className="w-4 h-4" /></FieldIcon>
                    <input
                      placeholder="Kata sandi"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      className={`${inputClass} pr-10`}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7780] hover:text-[#0F172A] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button type="button" onClick={() => setForgot(true)} className="self-center text-[12px] font-bold text-[#0F3B59] hover:underline -mt-0.5">
                    Lupa kata sandi?
                  </button>
                  {error && <div role="alert" className="text-[11.5px] text-[#DC2626] font-medium text-center animate-fadeIn">{error}</div>}
                </div>

                <button onClick={handleSignIn} disabled={signingIn} className={`${primaryBtn} mt-1 mb-5`}>
                  {signingIn ? "Memproses…" : "MASUK"}
                </button>

                <div className="flex items-center w-full mb-4">
                  <div className="flex-grow border-t border-dashed border-[#d5dde1]" />
                  <span className="mx-2.5 text-[10.5px] font-semibold text-[#6b7780] uppercase tracking-wide">atau</span>
                  <div className="flex-grow border-t border-dashed border-[#d5dde1]" />
                </div>

                <a
                  href="/api/auth/google"
                  className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-[#F5F7F9] text-[#3a3d40] font-semibold text-[13px] py-2.5 rounded-[8px] border border-[#C5CED3] active:scale-[0.98] transition-all duration-200 ease-out-expo"
                >
                  <GoogleLogo /> Masuk dengan Google
                </a>

                <p className="md:hidden text-center text-[12.5px] text-[#4b5560] mt-6">
                  Belum punya akun?{" "}
                  <button type="button" onClick={() => goMode("register")} className="font-bold text-[#0F3B59] hover:underline">Daftar</button>
                </p>
              </>
            )}
          </div>
        </div>

        {/* ---------- Daftar ---------- */}
        <div className={panel(!isSignin, "r")} aria-hidden={isSignin}>
          <div className="w-full max-w-[330px] mx-auto">
            <div className="text-center mb-6">
              <div className="text-[10.5px] font-bold uppercase tracking-[.14em] text-[#6b7780]">Portal PSI &amp; MOC</div>
              <h1 className="font-heading text-[32px] font-bold text-[#0F172A] mt-2 leading-tight">Buat Akun</h1>
            </div>

            {regSuccess ? (
              <div className="flex flex-col items-center text-center gap-2.5 py-8 animate-fadeInUp">
                <CheckCircle2 className="w-10 h-10 text-[#15803D] animate-popIn" strokeWidth={1.7} />
                <p className="text-[13.5px] font-bold text-[#0F172A]">Akun berhasil dibuat</p>
                <p className="text-[12px] text-[#4b5560] leading-relaxed">Menunggu Admin Regional menetapkan lokasi &amp; peran Anda.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 mb-2">
                  <div className="relative group">
                    <FieldIcon><User className="w-4 h-4" /></FieldIcon>
                    <input placeholder="Nama lengkap" type="text" value={regName} className={inputClass} onChange={(e) => { setRegName(e.target.value); setRegError(""); }} />
                  </div>
                  <div className="relative group">
                    <FieldIcon><AtSign className="w-4 h-4" /></FieldIcon>
                    <input placeholder="Username" type="text" autoComplete="username" value={regUsername} className={inputClass} onChange={(e) => { setRegUsername(e.target.value); setRegError(""); }} />
                  </div>
                  <div className="relative group">
                    <FieldIcon><Mail className="w-4 h-4" /></FieldIcon>
                    <input placeholder="Email" type="email" value={regEmail} className={inputClass} onChange={(e) => { setRegEmail(e.target.value); setRegError(""); }} />
                  </div>
                  <div className="relative group">
                    <FieldIcon><Lock className="w-4 h-4" /></FieldIcon>
                    <input
                      placeholder="Kata sandi"
                      type={showRegPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={regPassword}
                      className={`${inputClass} pr-10`}
                      onChange={(e) => { setRegPassword(e.target.value); setRegError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword((v) => !v)}
                      aria-label={showRegPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7780] hover:text-[#0F172A] transition-colors"
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <PasswordChecklist password={regPassword} />
                  {regError && <div role="alert" className="text-[11.5px] text-[#DC2626] font-medium text-center animate-fadeIn">{regError}</div>}
                </div>

                <button onClick={handleRegister} disabled={registering} className={`${primaryBtn} mt-1`}>
                  {registering ? "Memproses…" : "DAFTAR"}
                </button>

                <p className="md:hidden text-center text-[12.5px] text-[#4b5560] mt-6">
                  Sudah punya akun?{" "}
                  <button type="button" onClick={() => goMode("signin")} className="font-bold text-[#0F3B59] hover:underline">Masuk</button>
                </p>
              </>
            )}
          </div>
        </div>

        {/* ---------- Panel geser (hanya layar lebar) ---------- */}
        <div
          ref={overlayRef}
          className="hidden md:block absolute top-0 left-1/2 w-1/2 h-full z-20 text-white overflow-hidden transition-transform duration-[700ms] ease-[cubic-bezier(.65,0,.35,1)]"
          style={{ transform: isSignin ? "translateX(0)" : "translateX(-100%)", background: "linear-gradient(160deg, #124969 0%, #0F3B59 45%, #0B2C43 100%)" }}
        >
          <div className={`absolute inset-0 flex flex-col items-center justify-center text-center px-10 transition-all duration-500 ease-out-expo ${isSignin && !successMsg ? "opacity-100 translate-x-0 delay-200" : "opacity-0 translate-x-10 pointer-events-none"}`} aria-hidden={!isSignin}>
            <h2 className="font-heading leading-[.95] tracking-[-0.035em]">
              <span className="block text-[34px] font-light text-white/90">Belum punya</span>
              <span className="block text-[56px] font-extrabold">akun?</span>
            </h2>
            <span className="block w-10 h-[3px] rounded-full bg-white/70 mt-6" aria-hidden />
            <p className="text-[14px] text-white/75 mt-5 max-w-[250px] leading-[1.65]">Daftar dalam satu menit. Admin Regional akan mengaktifkan akun Anda.</p>
            <button
              type="button"
              tabIndex={isSignin ? 0 : -1}
              onClick={() => goMode("register")}
              className="mt-8 px-10 py-3 rounded-full bg-white text-[#0F3B59] text-[12.5px] font-extrabold tracking-[.14em] shadow-[0_8px_20px_-6px_rgba(0,0,0,.4)] hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-6px_rgba(0,0,0,.45)] active:translate-y-0 active:scale-[0.97] transition-all duration-200"
            >
              DAFTAR
            </button>
          </div>
          <div className={`absolute inset-0 flex flex-col items-center justify-center text-center px-10 transition-all duration-500 ease-out-expo ${!isSignin && !successMsg ? "opacity-100 translate-x-0 delay-200" : "opacity-0 -translate-x-10 pointer-events-none"}`} aria-hidden={isSignin}>
            <h2 className="font-heading leading-[.95] tracking-[-0.035em]">
              <span className="block text-[34px] font-light text-white/90">Sudah punya</span>
              <span className="block text-[56px] font-extrabold">akun?</span>
            </h2>
            <span className="block w-10 h-[3px] rounded-full bg-white/70 mt-6" aria-hidden />
            <p className="text-[14px] text-white/75 mt-5 max-w-[250px] leading-[1.65]">Masuk dengan email atau username Anda.</p>
            <button
              type="button"
              tabIndex={!isSignin ? 0 : -1}
              onClick={() => goMode("signin")}
              className="mt-8 px-10 py-3 rounded-full bg-white text-[#0F3B59] text-[12.5px] font-extrabold tracking-[.14em] shadow-[0_8px_20px_-6px_rgba(0,0,0,.4)] hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-6px_rgba(0,0,0,.45)] active:translate-y-0 active:scale-[0.97] transition-all duration-200"
            >
              MASUK
            </button>
          </div>
          {successMsg && (
            <div className="login-ok absolute inset-0 flex flex-col items-center justify-center text-center px-10" role="status" style={{ opacity: 0 }}>
              <svg width="84" height="84" viewBox="0 0 76 76" aria-hidden>
                <circle className="login-ok-ring" cx="38" cy="38" r="31" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1} transform="rotate(-90 38 38)" />
                <path className="login-ok-check" d="M24 39.5 L34 49 L53 28" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1} />
              </svg>
              <h2 className="font-heading text-[40px] font-extrabold tracking-[-0.03em] leading-tight mt-6">{successMsg}</h2>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

function SignIn2() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <SignIn2Content />
    </Suspense>
  );
}

export { SignIn2 };
