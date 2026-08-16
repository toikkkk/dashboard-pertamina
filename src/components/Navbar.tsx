"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePsi } from "@/lib/psiStore";
import { Shield, Bell, LogOut, AlertTriangle, ClipboardCheck, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { canUserApproveDoc } from "@/lib/mockData";

export default function Navbar() {
  const { activeUser, isLoggedIn, isAuthLoaded, logout, documents } = usePsi();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isAuthLoaded || !isLoggedIn) return null;

  const overdueCount = documents.filter((d) => d.status === "Expired").length;
  const pendingApprovalCount = documents.filter((d) => canUserApproveDoc(d, activeUser)).length;
  const totalNotifications = overdueCount + pendingApprovalCount;

  return (
    <header className="bg-[#284B63] text-white h-[56px] flex items-center border-b border-slate-800 sticky top-0 z-50">
      <div className="flex items-center justify-between w-full px-4 sm:px-6">

        {/* Brand Area (Matching Sidebar Width conceptually) */}
        <div className="flex items-center gap-3 w-56">
          <Shield className="h-5 w-5 text-amber-500" />
          <h1 className="font-black text-sm tracking-widest text-slate-100 uppercase">
            Portal PSI & MOC <span className="text-slate-400 font-medium tracking-normal text-xs normal-case ml-1">Regional Jatimbalinus</span>
          </h1>
        </div>

        {/* Right Actions */}
        <div className="flex flex-1 justify-end items-center gap-4">
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications((v) => !v)}
              className="text-slate-400 hover:text-amber-400 transition relative"
            >
              <Bell className="w-5 h-5" />
              {totalNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#D32F2F] rounded-full border border-[#284B63]"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-10 w-80 bg-white text-[#353535] rounded-xl shadow-2xl border border-[#D9D9D9] overflow-hidden animate-fadeIn">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <span className="text-xs font-black text-[#284B63] uppercase tracking-wider">Notifikasi</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {pendingApprovalCount > 0 && (
                    <Link
                      href="/directory?status=In+Routing"
                      onClick={() => setShowNotifications(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition"
                    >
                      <ClipboardCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-700">
                        <strong className="text-[#353535]">{pendingApprovalCount} dokumen</strong> menunggu persetujuan Anda
                      </span>
                    </Link>
                  )}
                  {overdueCount > 0 && (
                    <Link
                      href="/dilemma"
                      onClick={() => setShowNotifications(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition"
                    >
                      <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-700">
                        <strong className="text-[#353535]">{overdueCount} dokumen</strong> sudah lewat masa berlaku 5 tahun
                      </span>
                    </Link>
                  )}
                  {totalNotifications === 0 && (
                    <div className="flex items-start gap-3 px-4 py-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-500">Tidak ada notifikasi baru saat ini.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-[10px] font-black text-white">
                {activeUser.name.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold leading-tight">{activeUser.name}</span>
                <span className="text-[9px] text-amber-300 font-mono leading-tight">{activeUser.role} {activeUser.location}</span>
              </div>
            </div>
            
            <div className="w-px h-5 bg-slate-600 mx-1"></div>
            
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              title="Keluar Sesi"
              className="text-slate-400 hover:text-rose-500 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
