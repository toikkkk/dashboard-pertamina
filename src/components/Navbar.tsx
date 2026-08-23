"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePsi } from "@/lib/psiStore";
import {
  LayoutDashboard, AlertTriangle, FolderOpen, Search,
  Plus, Bell, LogOut, ChevronDown, ClipboardCheck, CheckCircle2, UserCog, Archive,
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

  const navItems = isPending
    ? [{ name: "Dashboard", path: "/", icon: LayoutDashboard }]
    : [
        { name: "Dashboard", path: "/", icon: LayoutDashboard },
        { name: "Sirkuler", path: "/approvals", icon: ClipboardCheck, badge: pendingApprovalCount, badgeTone: "warning" as const },
        { name: "Overdue", path: "/dilemma", icon: AlertTriangle, badge: overdueCount, badgeTone: "danger" as const },
        { name: "Direktori", path: "/directory", icon: FolderOpen },
        ...(activeUser.isRegionalAdmin
          ? [
              { name: "Kelola User", path: "/admin/users", icon: UserCog, badge: pendingUserCount, badgeTone: "warning" as const },
              { name: "Arsip Registry", path: "/admin/registry", icon: Archive },
            ]
          : []),
      ];

  return (
    <header className="flex-shrink-0 bg-white sticky top-0 z-[60] border-b border-[#DDE3EA] shadow-[0_1px_3px_rgba(15,23,42,.06)]">
      <div className="h-[68px] flex items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
            <div className="leading-[1.15]">
              <div className="font-heading text-[13.5px] font-bold tracking-[.04em] text-[#0F172A] uppercase">Portal PSI &amp; MOC</div>
              <div className="text-[10px] text-[#748094] font-medium tracking-[.03em]">Regional Jatimbalinus</div>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-[7px] px-4 py-2 rounded-full text-[12.5px] font-semibold transition-all duration-200 ease-out-expo ${
                    isActive
                      ? "bg-[#E0F2FE] text-[#0369A1]"
                      : "text-[#5B6472] hover:text-[#0F172A] hover:bg-[#F5F7F9] active:scale-[0.97]"
                  }`}
                >
                  <item.icon className="w-[14px] h-[14px]" strokeWidth={1.8} />
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
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {!isPending && (
            <>
              <form ref={searchRef} onSubmit={handleSearchSubmit} className="relative flex items-center">
                <button
                  type="button"
                  onClick={() => (searchOpen ? handleSearchSubmit() : openSearch())}
                  aria-label="Cari nomor dokumen"
                  className={`relative z-10 p-2 flex rounded-full transition-colors duration-200 ${searchOpen ? "text-[#0369A1]" : "text-[#5B6472] hover:bg-[#F5F7F9] hover:text-[#0F172A]"}`}
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
                  className={`min-h-[36px] text-[12.5px] rounded-full bg-[#F5F7F9] focus:bg-white text-[#0F172A] placeholder:text-[#9aa3af] border border-transparent focus:border-[#0369A1] outline-none transition-all duration-200 ease-out-expo overflow-hidden ${
                    searchOpen ? "w-[200px] pl-9 pr-3 ml-[-32px]" : "w-0 pl-0 pr-0 ml-0 border-none"
                  }`}
                />
                {searchError && (
                  <div className="absolute left-0 top-[42px] text-[11px] font-semibold text-white bg-[#DC2626] px-2 py-1 rounded-[2px] whitespace-nowrap shadow-[0_4px_12px_rgba(0,0,0,.2)] animate-fadeInUp">
                    Nomor dokumen tidak ditemukan
                  </div>
                )}
              </form>

              <Link
                href="/upload"
                className="flex items-center gap-[7px] bg-[#0F172A] hover:bg-[#1E293B] active:scale-[0.97] rounded-full pl-3.5 pr-4 py-2 transition-all duration-200 ml-1"
              >
                <Plus className="w-[15px] h-[15px] text-white" strokeWidth={2.2} />
                <span className="text-[12.5px] font-bold text-white">Dokumen Baru</span>
              </Link>

              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen((v) => !v)}
                  className={`relative p-2 flex rounded-full transition-colors duration-200 ${notifOpen ? "bg-[#F5F7F9] text-[#0F172A]" : "text-[#5B6472] hover:bg-[#F5F7F9] hover:text-[#0F172A]"}`}
                >
                  <Bell className="w-[17px] h-[17px]" strokeWidth={1.6} />
                  {totalNotifications > 0 && (
                    <span
                      className="absolute top-[7px] right-[7px] w-[7px] h-[7px] rounded-full border-[1.5px] border-white"
                      style={{ background: overdueCount > 0 ? "#DC2626" : "#B45309" }}
                    />
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-[46px] w-[308px] bg-white border border-[#D6DEE8] shadow-[0_12px_32px_rgba(0,0,0,.18)] z-[70] origin-top-right animate-dropIn">
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

          <div className="w-px h-[22px] bg-[#EBEEF2] mx-1" />

          <div className="relative" ref={userRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className={`flex items-center gap-2 py-1 pl-1 pr-2.5 rounded-full transition-colors duration-200 ${userMenuOpen ? "bg-[#F5F7F9]" : "hover:bg-[#F5F7F9]"}`}
            >
              <div className="w-7 h-7 rounded-full bg-[#E0F2FE] text-[#0369A1] flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                {activeUser.name.charAt(0)}
              </div>
              <div className="text-left leading-[1.25]">
                <div className="text-xs font-bold text-[#0F172A]">{activeUser.name}</div>
                <div className="text-[10px]" style={{ color: isPending ? "#B45309" : "#748094" }}>
                  {isPending ? "Menunggu Aktivasi" : `${activeUser.role} · ${activeUser.location ?? "Semua Lokasi"}`}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#9aa3af] ml-0.5" strokeWidth={2} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-12 w-[200px] bg-white border border-[#D6DEE8] shadow-[0_12px_32px_rgba(0,0,0,.18)] z-[70] p-1.5 origin-top-right animate-dropIn">
                <button
                  onClick={() => {
                    logout();
                    router.push("/login");
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-[2px] text-left hover:bg-[#E0F2FE] transition"
                >
                  <LogOut className="w-[15px] h-[15px] text-[#0369A1]" strokeWidth={1.7} />
                  <span className="text-[13px] font-semibold text-[#3a3d40]">Keluar Sesi</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
