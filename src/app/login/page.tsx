"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePsi } from "@/lib/psiStore";
import { SignIn2 } from "@/components/ui/clean-minimal-sign-in";
import { SIM_MULTI_SESSION } from "@/lib/simSession";
import { isAuthTransition } from "@/lib/localPref";

export default function LoginPage() {
  const router = useRouter();
  const { isLoggedIn, isAuthLoaded } = usePsi();

  useEffect(() => {
    // SIMULASI SEMENTARA: dalam mode multi-akun, halaman login harus tetap bisa dibuka
    // meski browser sudah punya sesi — itulah cara tab ini berganti ke akun lain.
    // Tanpa sakelar (produksi) perilaku asli: sudah login -> langsung ke dashboard.
    if (isAuthLoaded && isLoggedIn && !SIM_MULTI_SESSION && !isAuthTransition()) {
      router.push("/");
    }
  }, [isLoggedIn, isAuthLoaded, router]);

  if (!isAuthLoaded) {
    return <div className="min-h-screen bg-white flex items-center justify-center text-[#0F172A]">Memuat...</div>;
  }

  return <SignIn2 />;
}
