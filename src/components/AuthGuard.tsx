"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePsi } from "@/lib/psiStore";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isAuthLoaded } = usePsi();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isAuthLoaded && !isLoggedIn && pathname !== "/login") {
      router.push("/login");
    }
  }, [isAuthLoaded, isLoggedIn, pathname, router]);

  if (!isAuthLoaded) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-[#284B63] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-[#284B63]">Memeriksa Sesi Pengguna...</p>
      </div>
    );
  }

  if (!isLoggedIn && pathname !== "/login") {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center">
        <p className="text-xs font-bold text-slate-500">Mengalihkan ke Portal Login...</p>
      </div>
    );
  }

  return <>{children}</>;
}
