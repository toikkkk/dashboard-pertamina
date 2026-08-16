"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePsi } from "@/lib/psiStore";
import {
  LayoutDashboard,
  AlertTriangle,
  FolderOpen
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { documents, isLoggedIn, isAuthLoaded } = usePsi();
  
  if (!isAuthLoaded || !isLoggedIn) return null;

  const overdueCount = documents.filter((d) => d.status === "Expired").length;

  const menuItems = [
    { name: "Dashboard", path: "/", icon: <LayoutDashboard className="w-4 h-4" /> },
    { name: "Dilema 5T", path: "/dilemma", icon: <AlertTriangle className="w-4 h-4" />, badge: overdueCount },
    { name: "Direktori", path: "/directory", icon: <FolderOpen className="w-4 h-4" /> },
  ];

  return (
    <div className="w-56 bg-[#284B63] text-slate-300 flex flex-col h-[calc(100vh-56px)] sticky top-[56px] border-r border-slate-800 flex-shrink-0">
      <div className="flex-1 py-4">
        <p className="px-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
          Menu Utama
        </p>
        <nav className="space-y-1 px-2.5">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all border-l-2 ${
                  isActive
                    ? "bg-white/10 border-amber-400 text-white"
                    : "hover:bg-white/5 hover:text-slate-100 border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  {React.cloneElement(item.icon as React.ReactElement, {
                    className: `w-4 h-4 flex-shrink-0 ${isActive ? "text-amber-400" : "text-slate-400"}`,
                  })}
                  <span>{item.name}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="bg-[#D32F2F] text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
