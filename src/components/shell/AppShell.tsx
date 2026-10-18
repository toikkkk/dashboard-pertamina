"use client";

// Bungkus utama: sidebar + topbar, porting visual dari "ui terbaru dari manus" (lihat
// src/styles/shell.css). Menggantikan Navbar.tsx horizontal lama. Tidak menyentuh
// AuthGuard/routing — hanya kerangka tampilan seputar {children}.
import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { usePsi } from "@/lib/psiStore";
import { isRegionalUnit } from "@/lib/domain/regionalUnit";
import { useMocList } from "@/lib/useMoc";
import { isDocOverdue, isExcludedFromDashboard } from "@/lib/mockData";
import { mocPendingActions } from "@/lib/domain/moc";
import Sidebar, { buildNavItems } from "@/components/shell/Sidebar";
import Topbar from "@/components/shell/Topbar";
import UploadTray from "@/components/UploadTray";
import { readPref, takeEnterFlag, writePref } from "@/lib/localPref";

const COLLAPSE_KEY = "shell.sidebarCollapsed";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { activeUser, isLoggedIn, isAuthLoaded, documents, users } = usePsi();
  const pathname = usePathname();
  // Hook harus dipanggil sebelum early-return di bawah; kunci null = tidak fetch saat logout.
  const { mocs } = useMocList(isAuthLoaded && isLoggedIn);
  // Lencana "Sampah": dokumen yang boleh dikelola user ini dan hampir dihapus permanen. Akun menunggu aktivasi
  // (tanpa lokasi) tidak punya hak baca, jadi tidak ikut mengambil.
  const canSeeTrash = isAuthLoaded && isLoggedIn && (!!activeUser.isRegionalAdmin || !!activeUser.location);
  const { data: trashSummary } = useSWR<{ total: number; urgent: number }>(
    canSeeTrash ? "/api/documents/trash?summary=1" : null,
    (u: string) => fetch(u).then((r) => (r.ok ? r.json() : Promise.reject(new Error("gagal")))),
    { refreshInterval: 300000, revalidateOnFocus: false }
  );

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

  // Gerak masuk setelah login: seluruh kerangka naik dari bawah (kartu login keluar ke
  // atas, lihat clean-minimal-sign-in.tsx). Hanya sekali, dan tidak untuk reduced-motion.
  const rootRef = useRef<HTMLDivElement>(null);
  const showChrome = isAuthLoaded && isLoggedIn && pathname !== "/login";
  useEffect(() => {
    if (!showChrome || !takeEnterFlag()) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = rootRef.current?.querySelector(".app-shell");
    if (!el) return;
    gsap.fromTo(el, { y: "14vh", opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", clearProps: "transform,opacity" });
  }, [showChrome]);

  // Sama seperti Navbar lama: /login (dan sebelum sesi selesai diperiksa) tidak
  // memakai kerangka ini sama sekali — AuthGuard yang menangani redirect/spinner-nya.
  if (!showChrome) return <>{children}</>;

  const isPending = !activeUser.isRegionalAdmin && !activeUser.location;
  const overdueCount = documents.filter((d) => isDocOverdue(d) && !isExcludedFromDashboard(d)).length;
  const mocActor = { id: activeUser.id, name: activeUser.name, role: activeUser.role, location: activeUser.location, isRegionalAdmin: activeUser.isRegionalAdmin };
  const mocNotifs = mocs.map((m) => ({ m, acts: mocPendingActions(m, mocActor) })).filter((x) => x.acts.length > 0);
  const pendingUserCount = users.filter((u) => !u.isRegionalAdmin && !u.location).length;

  const { primaryNavItems, adminNavItems } = buildNavItems({
    isPending,
    isRegionalAdmin: !!activeUser.isRegionalAdmin,
    pendingMocCount: mocNotifs.length,
    overdueCount,
    pendingUserCount,
    trashUrgentCount: trashSummary?.urgent ?? 0,
    isRegionalUnitUser: isRegionalUnit(activeUser.location),
  });

  return (
    <div className="hsse-shell" ref={rootRef}>
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
              <span>© 2026 PT Pertamina Patra Niaga - Direktorat Optimasi Hilir &amp; Distribusi</span>
            </footer>
          </div>
        </main>
      </div>
      <UploadTray />
    </div>
  );
}
