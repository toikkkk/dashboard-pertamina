"use client";

// Panel navigasi kiri. DOM/kelas CSS ini adalah porting literal dari desain Manus
// (lihat src/styles/shell.css, hasil scoping otomatis dari "ui terbaru dari manus" di
// root repo) — hanya isi (rute, lencana, peran) yang disesuaikan dengan aplikasi ini.
import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  ScrollText,
  Settings,
  ClipboardList,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Trash2,
  UserCog,
  X,
} from "lucide-react";
import { usePsi } from "@/lib/psiStore";
import { isRegionalUnit } from "@/lib/domain/regionalUnit";
import { userRoleLabel } from "@/lib/domain/roleLabel";
import LogoutConfirm from "@/components/shell/LogoutConfirm";

interface NavItem {
  name: string;
  path: string;
  icon: typeof LayoutDashboard;
  badge?: number;
  badgeTone?: "warning" | "danger";
}

export default function Sidebar({
  mobileOpen,
  setMobileOpen,
  collapsed,
  setCollapsed,
  primaryNavItems,
  adminNavItems,
  isPending,
}: {
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  primaryNavItems: NavItem[];
  adminNavItems: NavItem[];
  isPending: boolean;
}) {
  const { activeUser, logout } = usePsi();
  const pathname = usePathname();
  const router = useRouter();

  const isNavActive = (path: string) => (path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`));

  // Keluar selalu lewat konfirmasi (dialog) supaya tidak logout tak sengaja.
  const [confirmLogout, setConfirmLogout] = useState(false);
  const askLogout = () => {
    setMobileOpen(false);
    setConfirmLogout(true);
  };
  const handleLogout = () => {
    setConfirmLogout(false);
    logout();
    router.push("/login");
  };

  const renderItem = (item: NavItem) => {
    const active = isNavActive(item.path);
    return (
      <Link
        key={item.path}
        href={item.path}
        className={`nav-item ${active ? "nav-item-active" : ""}`}
        aria-current={active ? "page" : undefined}
        title={collapsed ? item.name : undefined}
        onClick={() => setMobileOpen(false)}
      >
        <item.icon className="h-[17px] w-[17px]" strokeWidth={active ? 2.2 : 1.7} />
        <span>{item.name}</span>
        {item.badge !== undefined && item.badge > 0 ? (
          <span className={`nav-badge ${item.badgeTone === "danger" ? "nav-badge-danger" : "nav-badge-warning"}`}>{item.badge}</span>
        ) : (
          active && <span className="nav-active-dot" />
        )}
      </Link>
    );
  };

  return (
    <>
      {mobileOpen && <button aria-label="Tutup menu" className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""} ${collapsed ? "sidebar-collapsed" : ""}`}>
        <div className="sidebar-brand">
          <div className="collapsed-brand-mark" aria-hidden="true">P</div>
          <div>
            <Link href="/" className="brand-title brand-link" aria-label="Portal PSI dan MOC, ke dashboard" onClick={() => setMobileOpen(false)}>
              Portal PSI &amp; MOC
            </Link>
          </div>
          <button aria-label="Tutup navigasi" className="mobile-close" onClick={() => setMobileOpen(false)}>
            <X className="h-4 w-4" />
          </button>
          <button
            aria-label={collapsed ? "Perbesar sidebar" : "Perkecil sidebar"}
            className="sidebar-collapse-toggle"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {!isPending && !isRegionalUnit(activeUser.location) && (
          <Link href="/upload" aria-label="Buat dokumen baru" title={collapsed ? "Dokumen Baru" : undefined} className="new-document-button" onClick={() => setMobileOpen(false)}>
            <Plus className="h-4 w-4" />
            <span className="new-document-label">Dokumen Baru</span>
          </Link>
        )}

        <div className="sidebar-rule" />
        <div className="sidebar-label">Menu</div>
        <nav className="sidebar-nav" aria-label="Navigasi utama">
          {primaryNavItems.map(renderItem)}
        </nav>

        {adminNavItems.length > 0 && (
          <>
            <div className="sidebar-label sidebar-label-admin">Admin</div>
            <nav className="sidebar-nav" aria-label="Navigasi admin">
              {adminNavItems.map(renderItem)}
            </nav>
          </>
        )}

        <div className="sidebar-label sidebar-label-general">Umum</div>
        <nav className="sidebar-nav sidebar-nav-general" aria-label="Navigasi umum">
          {!isPending && renderItem({ name: "Pengaturan", path: "/pengaturan", icon: Settings })}
          <button className="nav-item" title={collapsed ? "Keluar" : undefined} onClick={askLogout}>
            <LogOut className="h-[16px] w-[16px]" strokeWidth={1.7} />
            <span>Keluar</span>
          </button>
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-user">
          <div className="avatar avatar-small">{activeUser.name.charAt(0)}</div>
          <div className="min-w-0">
            <div className="sidebar-user-name">{activeUser.name}</div>
            <div className="sidebar-user-role">{isPending ? "Menunggu Aktivasi" : userRoleLabel(activeUser)}</div>
            {!isPending && <div className="sidebar-user-role">{activeUser.location ?? "Semua Lokasi"}</div>}
          </div>
          <button aria-label="Menu pengguna" className="icon-button icon-button-dark" onClick={askLogout} title="Keluar">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </aside>
      <LogoutConfirm open={confirmLogout} onCancel={() => setConfirmLogout(false)} onConfirm={handleLogout} />
    </>
  );
}

export function buildNavItems({
  isPending,
  isRegionalAdmin,
  pendingMocCount,
  overdueCount,
  pendingUserCount,
  trashUrgentCount = 0,
  isRegionalUnitUser = false,
}: {
  isPending: boolean;
  isRegionalAdmin: boolean;
  pendingMocCount: number;
  overdueCount: number;
  pendingUserCount: number;
  trashUrgentCount?: number;
  /** Akun unit Regional Jatimbalinus: tidak punya PSI/arsip terminal, jadi menu Arsip Registry disembunyikan. */
  isRegionalUnitUser?: boolean;
}): { primaryNavItems: NavItem[]; adminNavItems: NavItem[] } {
  const primaryNavItems: NavItem[] = isPending
    ? [{ name: "Dashboard", path: "/", icon: LayoutDashboard }]
    : [
        { name: "Dashboard", path: "/", icon: LayoutDashboard },
        { name: "MOC", path: "/moc", icon: ClipboardList, badge: pendingMocCount, badgeTone: "warning" },
        { name: "Overdue", path: "/dilemma", icon: AlertTriangle, badge: overdueCount, badgeTone: "danger" },
        { name: "Direktori", path: "/directory", icon: FolderOpen },
        // Admin Regional memakainya dari grup Admin; user terminal melihat arsip terminalnya sendiri di menu utama.
        ...(isRegionalAdmin || isRegionalUnitUser ? [] : [{ name: "Arsip Registry", path: "/registry", icon: Archive } as NavItem]),
        { name: "Sampah", path: "/sampah", icon: Trash2, badge: trashUrgentCount, badgeTone: "warning" },
      ];
  const adminNavItems: NavItem[] =
    !isPending && isRegionalAdmin
      ? [
          { name: "Kelola User", path: "/admin/users", icon: UserCog, badge: pendingUserCount, badgeTone: "warning" },
          { name: "Arsip Registry", path: "/registry", icon: Archive },
          { name: "Log Aktivitas", path: "/admin/audit", icon: ScrollText },
        ]
      : [];
  return { primaryNavItems, adminNavItems };
}
