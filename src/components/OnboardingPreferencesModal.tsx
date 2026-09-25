"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { usePsi } from "@/lib/psiStore";
import { CheckCircle2, UserCog } from "lucide-react";
import { MOC_FUNCTION_SUGGESTIONS, MOC_ROLE_FLAGS, MOC_ROLES_NEED_FUNCTION, type MocRoleFlag } from "@/lib/domain/moc";

// Peran dasar akun (nilai = yang tersimpan di DB) dengan nama menurut TKO B6.2-08 (PSI) dan
// B13.3-07 (MoC): Initiator/Penanggung Jawab PSI, Controller (HSSE), Admin Regional.
const ROLES: { value: string; label: string }[] = [
  { value: "Penanggung Jawab PSI (Initiator)", label: "MoC Initiator / Penanggung Jawab PSI" },
  { value: "PSI / MOC Controller", label: "PSI Controller / MoC Controller (HSSE)" },
  { value: "Admin Regional", label: "Admin Regional" },
];

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
  const [mocRoles, setMocRoles] = useState<MocRoleFlag[]>([]);
  const [mocFunction, setMocFunction] = useState("");
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

  const isAdminRole = role === "Admin Regional";
  const effectiveMocRoles = isAdminRole ? [] : mocRoles;
  const needsFunction = effectiveMocRoles.some((r) => MOC_ROLES_NEED_FUNCTION.includes(r));
  const suggestions = Array.from(new Set(effectiveMocRoles.flatMap((r) => MOC_FUNCTION_SUGGESTIONS[r])));

  const toggleMocRole = (r: MocRoleFlag) =>
    setMocRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const handleSave = async () => {
    setError(null);
    if (needsFunction && !mocFunction.trim()) {
      setError("Isi fungsi/jabatan untuk peran Reviewer atau Approver.");
      return;
    }
    setSaving(true);
    try {
      await saveOnboardingPreferences(role, location, effectiveMocRoles, effectiveMocRoles.length > 0 ? mocFunction.trim() || null : null);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan preferensi.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[rgba(15,23,42,.55)] flex items-center justify-center z-[120] p-5 animate-backdropIn">
      <div className="w-full max-w-sm max-h-[92vh] overflow-y-auto bg-white rounded-[14px] shadow-[0_24px_64px_rgba(15,23,42,.3)] p-7 flex flex-col items-center border border-[#C5CED3] animate-modalPop">
        {saved ? (
          <>
            <CheckCircle2 className="w-10 h-10 text-[#15803D] mb-3" strokeWidth={1.7} />
            <h3 className="font-heading text-[15px] font-bold text-[#0F172A] mb-1.5 text-center">Preferensi tersimpan</h3>
            <p className="text-[12px] text-[#6b6e72] leading-relaxed text-center mb-4">
              Admin Regional akan meninjau pengajuan <strong>{ROLES.find((r) => r.value === role)?.label ?? role}</strong>
              {effectiveMocRoles.length > 0 ? ` (MoC ${effectiveMocRoles.join(", ")})` : ""}
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
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {!isAdminRole && (
                <div>
                  <div className="text-[10.5px] font-bold tracking-[.05em] text-[#6b6e72] uppercase mb-1.5">Peran MoC</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {MOC_ROLE_FLAGS.map((r) => (
                      <label key={r} className="flex items-center gap-1.5 text-[13px] font-semibold text-[#0F172A] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mocRoles.includes(r)}
                          onChange={() => toggleMocRole(r)}
                          className="w-4 h-4 accent-[#0F3B59] cursor-pointer"
                        />
                        MoC {r}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {effectiveMocRoles.length > 0 && (
                <div>
                  <div className="text-[10.5px] font-bold tracking-[.05em] text-[#6b6e72] uppercase mb-1.5">
                    Fungsi / Jabatan{needsFunction ? "" : " (opsional)"}
                  </div>
                  <input
                    list="onboarding-moc-functions"
                    value={mocFunction}
                    onChange={(e) => setMocFunction(e.target.value)}
                    maxLength={100}
                    placeholder={suggestions[0] ? `mis. ${suggestions[0]}` : "Fungsi/jabatan"}
                    className="w-full min-h-[40px] px-3 text-[13px] border border-[#C5CED3] rounded-[8px] bg-[#F5F7F9] focus:bg-white focus:outline-none focus:border-[#0F3B59] text-[#0F172A] transition-all duration-200"
                  />
                  <datalist id="onboarding-moc-functions">
                    {suggestions.map((f) => <option key={f} value={f} />)}
                  </datalist>
                </div>
              )}

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
