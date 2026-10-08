"use client";

// Pengaturan akun sendiri: tab Profil (data akun, hanya baca) dan Keamanan Akun (verifikasi email + MFA).
// Satu pintu di sidebar ("Pengaturan"); tab dipilih lewat ?tab=keamanan agar bisa ditautkan.
import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePsi } from "@/lib/psiStore";
import { userRoleLabel } from "@/lib/domain/roleLabel";
import AccountSecurityPanel from "@/components/settings/AccountSecurityPanel";

const TABS = [
  { key: "profil", label: "Profil" },
  { key: "keamanan", label: "Keamanan Akun" },
] as const;

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-2.5 border-b border-[#EEF2F4] last:border-b-0">
      <dt className="text-[12px] font-semibold text-[#6b6e72]">{label}</dt>
      <dd className="text-[13px] text-[#0F172A] min-w-0 break-words">{value}</dd>
    </div>
  );
}

function SettingsContent() {
  const tab = useSearchParams().get("tab") === "keamanan" ? "keamanan" : "profil";
  const { activeUser } = usePsi();

  return (
    <div className="max-w-[720px]">
      <h1 className="font-heading text-[22px] font-bold text-[#0F172A] mb-4">Pengaturan</h1>
      <div role="tablist" aria-label="Pengaturan" className="flex gap-1 mb-5 border-b border-[#D8E1E4]">
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <Link
              key={t.key}
              role="tab"
              aria-selected={on}
              href={t.key === "profil" ? "/pengaturan" : `/pengaturan?tab=${t.key}`}
              replace
              className={`px-4 py-2.5 text-[13px] font-bold -mb-px border-b-2 transition-colors duration-150 ${on ? "border-[#0F3B59] text-[#0F3B59]" : "border-transparent text-[#6b6e72] hover:text-[#0F172A]"}`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {tab === "profil" ? (
        <section className="bg-white border border-[#D8E1E4] rounded-[14px] px-5 py-2">
          <dl>
            <Row label="Nama" value={activeUser.name} />
            <Row label="Email" value={activeUser.email ?? "—"} />
            <Row label="Peran" value={userRoleLabel(activeUser)} />
            <Row label="Lokasi" value={activeUser.location ?? (activeUser.isRegionalAdmin ? "Semua lokasi" : "Belum ditetapkan")} />
          </dl>
        </section>
      ) : (
        <AccountSecurityPanel />
      )}
    </div>
  );
}

export default function PengaturanPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  );
}
