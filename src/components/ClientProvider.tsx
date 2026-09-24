"use client";

import React from "react";
import { PsiProvider } from "@/lib/psiStore";
import { SIM_MULTI_SESSION } from "@/lib/simSession"; // efek samping: memasang pembungkus fetch bila mode simulasi aktif

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <PsiProvider>
      {children}
      {SIM_MULTI_SESSION && (
        // SIMULASI SEMENTARA — pengingat agar tidak lupa dimatikan sebelum deploy/demo.
        <div className="fixed bottom-2 left-2 z-[200] px-2.5 py-1 rounded-full bg-[#B45309] text-white text-[10.5px] font-bold shadow print:hidden pointer-events-none">
          MODE SIMULASI: tiap tab bisa akun berbeda
        </div>
      )}
    </PsiProvider>
  );
}
