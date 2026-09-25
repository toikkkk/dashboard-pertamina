"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { usePsi } from "@/lib/psiStore";
import { X, CheckCircle2, UserCog } from "lucide-react";

const ROLES = [
  "Penanggung Jawab PSI (Initiator)",
  "PSI / MOC Controller",
  "Admin Regional",
] as const;

// Small popup shown to a freshly-registered (or freshly-Google-signed-in) user who has
// no location assigned yet. It asks them to pick a desired role + terminal, stored as
// requested_role / requested_location and surfaced to the Admin Regional as activation
// defaults — it never grants access itself (that still requires admin approval on
// /admin/users). Deliberately separate from the register form: the user registers (or
// signs in with Google) first, then lands here with nothing but a name/email/password
// behind them, and fills in role + terminal as a second, self-contained step.
export default function OnboardingPreferencesModal() {
  const { activeUser, locations, saveOnboardingPreferences, isLoggedIn } = usePsi();
  const [role, setRole] = useState<string>("Penanggung Jawab PSI (Initiator)");
  const [location, setLocation] = useState<string>(locations[0]?.locationName ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Animasi login (panel biru → "Login berhasil" → kartu naik → dashboard naik dari bawah)
  // harus selesai dulu. Sesi sudah aktif selama animasi masih di /login, jadi popup ditahan
  // di /login dan, setelah pindah ke dashboard, ditunda sampai gerak masuk dashboard selesai.
  const pathname = usePathname();
  const cameFromLogin = useRef(false);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (pathname === "/login") {
      cameFromLogin.current = true;
      setSettled(false);
      return;
    }
    if (!cameFromLogin.current) {
      setSettled(true);
      return;
    }
    const t = window.setTimeout(() => setSettled(true), 1000);
    return () => window.clearTimeout(t);
  }, [pathname]);

  // Only render for a LOGGED-IN pending user who hasn't picked preferences yet. The
  // isLoggedIn check matters: while logged out, `activeUser` is the PENDING_USER
  // placeholder (location=null, not admin), which would otherwise satisfy `isPending`
  // and put this popup on top of the login page. Once they've submitted
  // (requestedRole/requestedLocation set) or dismissed, hide the popup.
  const isPending = isLoggedIn && !activeUser.isRegionalAdmin && !activeUser.location;
  const hasPreferences = Boolean(activeUser.requestedRole || activeUser.requestedLocation);
  if (!isPending || hasPreferences || dismissed || !settled) return null;

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      await saveOnboardingPreferences(role, location);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan preferensi.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[rgba(15,23,42,.55)] flex items-center justify-center z-[120] p-5 animate-backdropIn">
      <div className="w-full max-w-sm bg-white rounded-[14px] shadow-[0_24px_64px_rgba(15,23,42,.3)] p-7 flex flex-col items-center border border-[#C5CED3] animate-modalPop">
        {saved ? (
          <>
            <CheckCircle2 className="w-10 h-10 text-[#15803D] mb-3" strokeWidth={1.7} />
            <h3 className="font-heading text-[15px] font-bold text-[#0F172A] mb-1.5 text-center">Preferensi tersimpan</h3>
            <p className="text-[12px] text-[#6b6e72] leading-relaxed text-center mb-4">
              Admin Regional akan meninjau pengajuan <strong>{role}</strong>
              {location ? ` di ${location}` : ""} sebelum akun Anda aktif.
            </p>
            <button
              onClick={() => setDismissed(true)}
              className="w-full bg-[#0F3B59] hover:bg-[#0B2C43] text-white font-heading font-bold text-[13.5px] py-2.5 rounded-[8px] active:scale-[0.98] transition-all duration-200"
            >
              Lanjut ke Dashboard
            </button>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-[12px] bg-[#0F3B59] flex items-center justify-center mb-4">
              <UserCog className="w-6 h-6 text-white" strokeWidth={1.8} />
            </div>
            <h3 className="font-heading text-[15px] font-bold text-[#0F172A] mb-1 text-center">Lengkapi Profil Anda</h3>
            <p className="text-[12px] text-[#6b6e72] leading-relaxed text-center mb-5">
              Pilih peran dan terminal Anda. Admin Regional akan menyetujui sebelum akun aktif.
            </p>

            <div className="w-full flex flex-col gap-3.5">
              <div>
                <div className="text-[10.5px] font-bold tracking-[.05em] text-[#6b6e72] uppercase mb-1.5">Peran</div>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full min-h-[40px] px-3 text-[13px] border border-[#C5CED3] rounded-[8px] bg-[#F5F7F9] focus:bg-white focus:outline-none focus:border-[#0F3B59] text-[#0F172A] transition-all duration-200"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-[10.5px] font-bold tracking-[.05em] text-[#6b6e72] uppercase mb-1.5">Terminal</div>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full min-h-[40px] px-3 text-[13px] border border-[#C5CED3] rounded-[8px] bg-[#F5F7F9] focus:bg-white focus:outline-none focus:border-[#0F3B59] text-[#0F172A] transition-all duration-200"
                >
                  {locations.map((l) => (
                    <option key={l.locationName} value={l.locationName}>{l.locationName}</option>
                  ))}
                </select>
              </div>

              {error && <div className="text-[11.5px] text-[#DC2626] font-medium animate-fadeIn">{error}</div>}

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-[#0F3B59] hover:bg-[#0B2C43] text-white font-heading font-bold text-[13.5px] py-2.5 rounded-[8px] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
