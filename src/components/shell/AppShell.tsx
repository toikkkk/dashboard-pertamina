"use client";

// Bungkus utama: sidebar + topbar, porting visual dari "ui terbaru dari manus" (lihat
// src/styles/shell.css). Menggantikan Navbar.tsx horizontal lama. Tidak menyentuh
// AuthGuard/routing — hanya kerangka tampilan seputar {children}.
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { usePsi } from "@/lib/psiStore";
import { useMocList } from "@/lib/useMoc";
import { isDocOverdue } from "@/lib/mockData";
import { mocPendingActions } from "@/lib/domain/moc";
import Sidebar, { buildNavItems } from "@/components/shell/Sidebar";
import Topbar from "@/components/shell/Topbar";
import { readPref, writePref } from "@/lib/localPref";

const COLLAPSE_KEY = "shell.sidebarCollapsed";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { activeUser, isLoggedIn, isAuthLoaded, documents, users } = usePsi();
  const pathname = usePathname();
  // Hook harus dipanggil sebelum early-return di bawah; kunci null = tidak fetch saat logout.
  const { mocs } = useMocList(isAuthLoaded && isLoggedIn);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (readPref(COLLAPSE_KEY) === "1") setCollapsed(true);
  }, []);
  const toggleCollapsed = (v: boolean) => {
    setCollapsed(v);
    writePref(COLLAPSE_KEY, v ? "1" : "0");
  };

  // Tutup drawer mobile begitu rute berpindah (tap link di dalamnya).
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Sama seperti Navbar lama: /login (dan sebelum sesi selesai diperiksa) tidak
  // memakai kerangka ini sama sekali — AuthGuard yang menangani redirect/spinner-nya.
  if (!isAuthLoaded || !isLoggedIn || pathname === "/login") return <>{children}</>;

  const isPending = !activeUser.isRegionalAdmin && !activeUser.location;
  const overdueCount = documents.filter(isDocOverdue).length;
  const mocActor = { id: activeUser.id, name: activeUser.name, role: activeUser.role, location: activeUser.location, isRegionalAdmin: activeUser.isRegionalAdmin };
  const mocNotifs = mocs.map((m) => ({ m, acts: mocPendingActions(m, mocActor) })).filter((x) => x.acts.length > 0);
  const pendingUserCount = users.filter((u) => !u.isRegionalAdmin && !u.location).length;

  const { primaryNavItems, adminNavItems } = buildNavItems({
    isPending,
    isRegionalAdmin: !!activeUser.isRegionalAdmin,
    pendingMocCount: mocNotifs.length,
    overdueCount,
    pendingUserCount,
  });

  return (
    <div className="hsse-shell">
      <a className="skip-link" href="#main-content">Lewati ke konten utama</a>
      <div className="app-shell">
        <Sidebar
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          collapsed={collapsed}
          setCollapsed={toggleCollapsed}
          primaryNavItems={primaryNavItems}
          adminNavItems={adminNavItems}
          isPending={isPending}
        />
        <main id="main-content" className="main-shell">
          <Topbar setMobileOpen={setMobileOpen} overdueCount={overdueCount} mocNotifs={mocNotifs} isPending={isPending} />
          <div className="main-inner">
            {children}
            <footer className="page-footer">
              <span>© 2026 PT Pertamina (Persero) · Direktorat Logistik &amp; Infrastruktur</span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
