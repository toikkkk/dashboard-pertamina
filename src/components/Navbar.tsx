"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePsi } from "@/lib/psiStore";
import {
  LayoutDashboard, AlertTriangle, FolderOpen, Search,
  Plus, Bell, LogOut, ChevronDown, ClipboardCheck, CheckCircle2, UserCog, Archive, Menu, X,
} from "lucide-react";
import { canUserApproveDoc, isDocOverdue } from "@/lib/mockData";

export default function Navbar() {
  const { activeUser, isLoggedIn, isAuthLoaded, logout, documents, allDocuments, users } = usePsi();
  const pathname = usePathname();
  const router = useRouter();

  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLFormElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node) && !searchQuery) setSearchOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchQuery]);

  // Route changes (tapping a link inside the mobile panel) should close the panel
  // instead of leaving it open over the newly-navigated page.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const openSearch = () => {
    setSearchOpen(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    const found = allDocuments.find((d) => d.documentNumber.toLowerCase() === q);
    if (found) {
      setSearchError(false);
      setSearchQuery("");
      setSearchOpen(false);
      setMobileMenuOpen(false);
      router.push(`/document/${found.id}`);
      return;
    }
    setSearchError(true);
  };

  if (!isAuthLoaded || !isLoggedIn) return null;

  const overdueCount = documents.filter(isDocOverdue).length;
  const pendingApprovalCount = documents.filter((d) => canUserApproveDoc(d, activeUser)).length;
  const totalNotifications = overdueCount + pendingApprovalCount;

  const pendingUserCount = users.filter((u) => !u.isRegionalAdmin && !u.location).length;
  const isPending = !activeUser.isRegionalAdmin && !activeUser.location;

  // Split into primary workflow nav vs. admin-only tools — rendered as two visually
  // distinct groups (divider between them) on desktop instead of one flat row of 6,
  // and kept as a single flattened list for the mobile panel, where icons still carry
  // their weight (a vertical list benefits from them more than a horizontal one does).
  const primaryNavItems = isPending
    ? [{ name: "Dashboard", path: "/", icon: LayoutDashboard }]
    : [
        { name: "Dashboard", path: "/", icon: LayoutDashboard },
        { name: "Sirkuler", path: "/approvals", icon: ClipboardCheck, badge: pendingApprovalCount, badgeTone: "warning" as const },
        { name: "Overdue", path: "/dilemma", icon: AlertTriangle, badge: overdueCount, badgeTone: "danger" as const },
        { name: "Direktori", path: "/directory", icon: FolderOpen },
      ];
  const adminNavItems: { name: string; path: string; icon: typeof UserCog; badge?: number; badgeTone?: "warning" | "danger" }[] =
    !isPending && activeUser.isRegionalAdmin
      ? [
          { name: "Kelola User", path: "/admin/users", icon: UserCog, badge: pendingUserCount, badgeTone: "warning" },
          { name: "Arsip Registry", path: "/admin/registry", icon: Archive },
        ]
      : [];
  const navItems = [...primaryNavItems, ...adminNavItems];

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="flex-shrink-0 bg-white sticky top-0 z-[60] border-b border-[#DDE3EA] shadow-[0_1px_3px_rgba(15,23,42,.06)]">
      <div className="h-[60px] lg:h-[68px] flex items-center justify-between px-3.5 lg:px-6">
        <div className="flex items-center gap-3 lg:gap-8 min-w-0">
          {/* Hamburger — mobile/tablet only; the full inline nav below takes over at lg */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
            className="lg:hidden flex items-center justify-center w-10 h-10 -ml-1.5 flex-shrink-0 rounded-full text-[#5B6472] hover:bg-[#F5F7F9] active:scale-[0.97] transition-all duration-200"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" strokeWidth={1.9} /> : <Menu className="w-5 h-5" strokeWidth={1.9} />}
          </button>

          {/* Text-only wordmark, one line — the icon-in-colored-square badge tried
              here earlier got called out immediately (same generic-template tell
              KpiSummaryCards' own comments already flag for stat tiles), and the
              stacked two-line title+caption block above it is its own common
              "logo lockup" default. A single line, weight/color doing the work
              instead of a decorative mark, reads more like an intentional
              wordmark than a template slot waiting for a logo. */}
          <Link href="/" className="flex items-baseline gap-2 min-w-0">
            <span className="font-heading text-[13px] lg:text-[14px] font-bold tracking-[.02em] text-[#0F172A] uppercase whitespace-nowrap">
              Portal PSI &amp; MOC
            </span>
            <span className="hidden sm:inline text-[#C5CED3]">/</span>
            <span className="hidden sm:inline text-[11px] text-[#748094] font-medium truncate">Regional Jatimbalinus</span>
          </Link>

          {/* Text-only on desktop — icons dropped here (kept in the mobile panel,
              where a vertical list benefits from them more): six mismatched icon
              glyphs in a row read as visual noise more than they aided scanning,
              and the active pill + colored badge already carry the state that
              matters. Admin-only tools get their own group past a hairline divider
              instead of sitting flush with the 4 everyday workflow items. */}
          <nav className="hidden lg:flex items-center gap-1">
            {primaryNavItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-[7px] px-4 py-2 rounded-full text-[12.5px] font-semibold transition-all duration-200 ease-out-expo ${
                    isActive
                      ? "bg-[#E2E8EB] text-[#0F3B59]"
                      : "text-[#5B6472] hover:text-[#0F172A] hover:bg-[#F5F7F9] active:scale-[0.97]"
                  }`}
                >
                  <span>{item.name}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      key={item.badge}
                      className="text-[10px] font-bold px-[5px] py-px rounded-full animate-popIn"
                      style={{ background: item.badgeTone === "danger" ? "#DC2626" : "#B45309", color: "#fff" }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {adminNavItems.length > 0 && (
              <>
                <div className="w-px h-5 bg-[#EBEEF2] mx-1.5" aria-hidden />
                {adminNavItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`flex items-center gap-[7px] px-4 py-2 rounded-full text-[12.5px] font-semibold transition-all duration-200 ease-out-expo ${
                        isActive
                          ? "bg-[#E2E8EB] text-[#0F3B59]"
                          : "text-[#5B6472] hover:text-[#0F172A] hover:bg-[#F5F7F9] active:scale-[0.97]"
                      }`}
                    >
                      <span>{item.name}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          key={item.badge}
                          className="text-[10px] font-bold px-[5px] py-px rounded-full animate-popIn"
                          style={{ background: item.badgeTone === "danger" ? "#DC2626" : "#B45309", color: "#fff" }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
          {!isPending && (
            <>
              {/* Search — icon-only trigger on mobile (opens the full mobile panel's
                  search field instead of an inline expanding input, which has no
                  comfortable width to expand into on a narrow header) */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Cari nomor dokumen"
                className="lg:hidden flex items-center justify-center w-10 h-10 rounded-full text-[#5B6472] hover:bg-[#F5F7F9] transition-colors duration-200"
              >
                <Search className="w-[18px] h-[18px]" strokeWidth={1.8} />
              </button>

              <form ref={searchRef} onSubmit={handleSearchSubmit} className="hidden lg:flex relative items-center">
                <button
                  type="button"
                  onClick={() => (searchOpen ? handleSearchSubmit() : openSearch())}
                  aria-label="Cari nomor dokumen"
                  className={`relative z-10 p-2 flex rounded-full transition-colors duration-200 ${searchOpen ? "text-[#0F3B59]" : "text-[#5B6472] hover:bg-[#F5F7F9] hover:text-[#0F172A]"}`}
                >
                  <Search className="w-[16px] h-[16px]" strokeWidth={1.8} />
                </button>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchError(false);
                  }}
                  placeholder="Cari nomor dokumen..."
                  className={`min-h-[36px] text-[12.5px] rounded-full bg-[#F5F7F9] focus:bg-white text-[#0F172A] placeholder:text-[#9aa3af] border border-transparent focus:border-[#0F3B59] outline-none transition-all duration-200 ease-out-expo overflow-hidden ${
                    searchOpen ? "w-[200px] pl-9 pr-3 ml-[-32px]" : "w-0 pl-0 pr-0 ml-0 border-none"
                  }`}
                />
                {searchError && (
                  <div className="absolute left-0 top-[42px] text-[11px] font-semibold text-white bg-[#DC2626] px-2 py-1 rounded-[8px] whitespace-nowrap shadow-[0_4px_12px_rgba(0,0,0,.2)] animate-fadeInUp">
                    Nomor dokumen tidak ditemukan
                  </div>
                )}
              </form>

              <Link
                href="/upload"
                aria-label="Dokumen Baru"
                className="flex items-center gap-[7px] bg-[#0F3B59] hover:bg-[#0B2C43] active:scale-[0.97] rounded-full px-2.5 lg:pl-3.5 lg:pr-4 py-2 transition-all duration-200 lg:ml-1"
              >
                <Plus className="w-[16px] h-[16px] lg:w-[15px] lg:h-[15px] text-white flex-shrink-0" strokeWidth={2.2} />
                <span className="hidden lg:inline text-[12.5px] font-bold text-white whitespace-nowrap">Dokumen Baru</span>
              </Link>

              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen((v) => !v)}
                  aria-label="Notifikasi"
                  className={`relative flex items-center justify-center w-10 h-10 lg:w-auto lg:h-auto lg:p-2 rounded-full transition-colors duration-200 ${notifOpen ? "bg-[#F5F7F9] text-[#0F172A]" : "text-[#5B6472] hover:bg-[#F5F7F9] hover:text-[#0F172A]"}`}
                >
                  <Bell className="w-[17px] h-[17px]" strokeWidth={1.6} />
                  {totalNotifications > 0 && (
                    <span
                      className="absolute top-[9px] right-[9px] lg:top-[7px] lg:right-[7px] w-[7px] h-[7px] rounded-full border-[1.5px] border-white"
                      style={{ background: overdueCount > 0 ? "#DC2626" : "#B45309" }}
                    />
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-[-8px] sm:right-0 top-[46px] w-[calc(100vw-24px)] max-w-[308px] bg-white border border-[#C5CED3] shadow-[0_12px_32px_rgba(0,0,0,.18)] z-[70] origin-top-right animate-dropIn">
                    <div className="px-3.5 py-2.5 bg-[#f7f7f8] border-b border-[#e5e5e7] text-[11px] font-bold tracking-wider uppercase text-[#0F172A]">
                      Notifikasi
                    </div>
                    <div>
                      {pendingApprovalCount > 0 && (
                        <Link
                          href="/approvals"
                          onClick={() => setNotifOpen(false)}
                          className="flex gap-2.5 px-3.5 py-3 border-b border-[#f0f0f1] hover:bg-[#f7f7f8] transition"
                        >
                          <ClipboardCheck className="w-[15px] h-[15px] text-[#B45309] flex-shrink-0 mt-0.5" strokeWidth={1.7} />
                          <span className="text-[12.5px] text-[#3a3d40]">
                            <strong>{pendingApprovalCount} dokumen</strong> menunggu persetujuan Anda
                          </span>
                        </Link>
                      )}
                      {overdueCount > 0 && (
                        <Link
                          href="/dilemma"
                          onClick={() => setNotifOpen(false)}
                          className="flex gap-2.5 px-3.5 py-3 hover:bg-[#f7f7f8] transition"
                        >
                          <AlertTriangle className="w-[15px] h-[15px] text-[#DC2626] flex-shrink-0 mt-0.5" strokeWidth={1.7} />
                          <span className="text-[12.5px] text-[#3a3d40]">
                            <strong>{overdueCount} dokumen</strong> sudah lewat masa berlaku 5 tahun
                          </span>
                        </Link>
                      )}
                      {totalNotifications === 0 && (
                        <div className="flex gap-2.5 px-3.5 py-3">
                          <CheckCircle2 className="w-[15px] h-[15px] text-[#15803D] flex-shrink-0" strokeWidth={1.7} />
                          <span className="text-[12.5px] text-[#6b6e72]">Tidak ada notifikasi baru saat ini.</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="hidden sm:block w-px h-[22px] bg-[#EBEEF2] mx-1" />

          {/* User menu — full name+role on lg, avatar-only below that (name lives in
              the mobile panel's header instead, where there's room for it). */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-label="Menu pengguna"
              className={`flex items-center gap-2 py-1 pl-1 pr-1 lg:pr-2.5 rounded-full transition-colors duration-200 ${userMenuOpen ? "bg-[#F5F7F9]" : "hover:bg-[#F5F7F9]"}`}
            >
              <div className="w-8 h-8 lg:w-7 lg:h-7 rounded-full bg-[#E2E8EB] text-[#0F3B59] flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                {activeUser.name.charAt(0)}
              </div>
              <div className="hidden lg:block text-left leading-[1.25]">
                <div className="text-xs font-bold text-[#0F172A]">{activeUser.name}</div>
                <div className="text-[10px]" style={{ color: isPending ? "#B45309" : "#748094" }}>
                  {isPending ? "Menunggu Aktivasi" : `${activeUser.role} · ${activeUser.location ?? "Semua Lokasi"}`}
                </div>
              </div>
              <ChevronDown className="hidden lg:block w-3.5 h-3.5 text-[#9aa3af] ml-0.5" strokeWidth={2} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-12 w-[220px] bg-white border border-[#C5CED3] shadow-[0_12px_32px_rgba(0,0,0,.18)] z-[70] p-1.5 origin-top-right animate-dropIn">
                <div className="lg:hidden px-2.5 py-2 mb-1 border-b border-[#f0f0f1]">
                  <div className="text-xs font-bold text-[#0F172A]">{activeUser.name}</div>
                  <div className="text-[10px]" style={{ color: isPending ? "#B45309" : "#748094" }}>
                    {isPending ? "Menunggu Aktivasi" : `${activeUser.role} · ${activeUser.location ?? "Semua Lokasi"}`}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-[8px] text-left hover:bg-[#E2E8EB] transition"
                >
                  <LogOut className="w-[15px] h-[15px] text-[#0F3B59]" strokeWidth={1.7} />
                  <span className="text-[13px] font-semibold text-[#3a3d40]">Keluar Sesi</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile nav panel — slides down below the header, everything the inline
          desktop nav + toolbar normally carries, stacked as full-width rows so
          every touch target stays comfortably above 44px. */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#eceded] bg-white shadow-[0_12px_24px_rgba(15,23,42,.08)] animate-dropIn max-h-[calc(100vh-60px)] overflow-y-auto">
          {!isPending && (
            <form onSubmit={handleSearchSubmit} className="p-3.5 border-b border-[#f0f0f1]">
              <div className="relative">
                <Search className="w-4 h-4 text-[#9a9da0] absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.8} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchError(false);
                  }}
                  placeholder="Cari nomor dokumen..."
                  className="w-full min-h-[42px] pl-9 pr-3 text-[13px] rounded-[8px] bg-[#F5F7F9] focus:bg-white text-[#0F172A] placeholder:text-[#9aa3af] border border-transparent focus:border-[#0F3B59] outline-none transition-all duration-200"
                />
              </div>
              {searchError && <p className="mt-1.5 text-[11.5px] font-semibold text-[#DC2626]">Nomor dokumen tidak ditemukan</p>}
            </form>
          )}

          <nav className="p-2 flex flex-col gap-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-[8px] text-[13.5px] font-semibold transition-colors duration-200 ${
                    isActive ? "bg-[#E2E8EB] text-[#0F3B59]" : "text-[#3a3d40] hover:bg-[#F5F7F9]"
                  }`}
                >
                  <item.icon className="w-[17px] h-[17px] flex-shrink-0" strokeWidth={1.8} />
                  <span className="flex-1">{item.name}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className="text-[10.5px] font-bold px-[7px] py-[2px] rounded-full"
                      style={{ background: item.badgeTone === "danger" ? "#DC2626" : "#B45309", color: "#fff" }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {!isPending && (
            <div className="p-2 pt-0">
              <Link
                href="/upload"
                className="flex items-center justify-center gap-2 bg-[#0F3B59] hover:bg-[#0B2C43] active:scale-[0.98] rounded-full py-3 transition-all duration-200"
              >
                <Plus className="w-4 h-4 text-white" strokeWidth={2.2} />
                <span className="text-[13.5px] font-bold text-white">Dokumen Baru</span>
              </Link>
            </div>
          )}

          <div className="p-2 pt-0 border-t border-[#f0f0f1] mt-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-[8px] text-left text-[13.5px] font-semibold text-[#3a3d40] hover:bg-[#F5F7F9] transition-colors duration-200 mt-1"
            >
              <LogOut className="w-[17px] h-[17px] text-[#0F3B59] flex-shrink-0" strokeWidth={1.7} />
              Keluar Sesi
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
