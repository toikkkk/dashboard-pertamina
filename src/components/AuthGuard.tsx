"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePsi } from "@/lib/psiStore";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isAuthLoaded, activeUser } = usePsi();
  const pathname = usePathname();
  const router = useRouter();

  // Self-registered account with no location assigned yet. Not locked out entirely —
  // gets read-only access to the dashboard ("/") so they can see the portal is alive
  // while waiting, but every other route (directory, approvals, upload, admin, document
  // detail) redirects back to "/" until an Admin Regional runs assignUserAccess. The
  // dashboard itself shows this state via a banner (see page.tsx) rather than blocking here.
  const isPending = isLoggedIn && !activeUser.isRegionalAdmin && !activeUser.location;

  useEffect(() => {
    if (isAuthLoaded && !isLoggedIn && pathname !== "/login") {
      router.push("/login");
    }
  }, [isAuthLoaded, isLoggedIn, pathname, router]);

  useEffect(() => {
    if (isAuthLoaded && isPending && pathname !== "/") {
      router.replace("/");
    }
  }, [isAuthLoaded, isPending, pathname, router]);

  if (!isAuthLoaded) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-[#0369A1] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-[#0369A1]">Memeriksa Sesi Pengguna...</p>
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

  if (isPending && pathname !== "/") {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center">
        <p className="text-xs font-bold text-slate-500">Mengalihkan ke Dashboard...</p>
      </div>
    );
  }

  return <>{children}</>;
}
