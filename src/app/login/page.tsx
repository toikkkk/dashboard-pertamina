"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePsi } from "@/lib/psiStore";
import { SignIn2 } from "@/components/ui/clean-minimal-sign-in";

export default function LoginPage() {
  const router = useRouter();
  const { isLoggedIn, isAuthLoaded } = usePsi();

  useEffect(() => {
    if (isAuthLoaded && isLoggedIn) {
      router.push("/");
    }
  }, [isLoggedIn, isAuthLoaded, router]);

  if (!isAuthLoaded) {
    return <div className="min-h-screen bg-white flex items-center justify-center text-[#0F172A]">Memuat...</div>;
  }

  return <SignIn2 />;
}
