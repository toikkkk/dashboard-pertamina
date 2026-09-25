"use client";

// Bilah atas: pencarian nomor dokumen, hamburger mobile, notifikasi (bawaan dari
// Navbar lama), dan menu profil. DOM/kelas CSS porting dari desain Manus.
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bell, CheckCircle2, ChevronDown, ClipboardList, LogOut, Menu, Search } from "lucide-react";
import { usePsi } from "@/lib/psiStore";
import { mocPendingActions, type MocAction, type MocRequest } from "@/lib/domain/moc";

const mocNotifText = (m: MocRequest, a: MocAction): string => {
  if (a === "review") return `MOC "${m.judul || "tanpa judul"}" diajukan kepada Anda untuk direview`;
  if (a === "decide") return `MOC "${m.judul || "tanpa judul"}" menunggu keputusan Anda sebagai Approver`;
  if (a === "register") return `MOC "${m.judul || "tanpa judul"}" sudah disetujui dan menunggu registrasi Anda`;
  return m.validationState === "draft"
    ? `Draf MOC "${m.judul || "tanpa judul"}" belum diajukan`
    : `MOC "${m.judul || "tanpa judul"}" dikembalikan — perbaiki lalu ajukan ulang`;
};

export default function Topbar({
  setMobileOpen,
  overdueCount,
  mocNotifs,
  isPending,
}: {
  setMobileOpen: (v: boolean) => void;
  overdueCount: number;
  mocNotifs: { m: MocRequest; acts: MocAction[] }[];
  isPending: boolean;
}) {
  const { activeUser, allDocuments, logout } = usePsi();
  const router = useRouter();

  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const totalNotifications = overdueCount + mocNotifs.length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;
    const found = allDocuments.find((d) => d.documentNumber.toLowerCase() === q);
    if (found) {
      setError(false);
      setQuery("");
      router.push(`/document/${found.id}`);
      return;
    }
    setError(true);
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="topbar">
      <button className="mobile-menu" aria-label="Buka navigasi" onClick={() => setMobileOpen(true)}>
        <Menu className="h-5 w-5" />
      </button>

      {!isPending ? (
        <form onSubmit={handleSearch} className="topbar-search" role="search">
          <label className="sr-only" htmlFor="doc-search">Cari nomor dokumen</label>
          <input
            id="doc-search"
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setError(false); }}
            placeholder="Cari nomor dokumen…"
            className="topbar-search-input"
          />
          <button type="submit" aria-label="Cari" className="header-icon-button">
            <Search className="h-[18px] w-[18px]" />
          </button>
          {error && <p className="topbar-search-error" role="alert">Nomor dokumen tidak ditemukan</p>}
        </form>
      ) : (
        <div className="topbar-search" />
      )}

      <div className="topbar-actions">
        {!isPending && (
          <div className="relative" ref={notifRef}>
            <button aria-label="Notifikasi" className="header-icon-button notification-button" onClick={() => setNotifOpen((v) => !v)}>
              <Bell className="h-[18px] w-[18px]" />
              {totalNotifications > 0 && <span className="notification-dot" />}
            </button>
            {notifOpen && (
              <div className="topbar-panel">
                <div className="topbar-panel-title">Notifikasi</div>
                <div className="topbar-panel-body">
                  {mocNotifs.slice(0, 6).map(({ m, acts }) => (
                    <Link key={m.id} href={`/moc/${m.id}`} onClick={() => setNotifOpen(false)} className="topbar-panel-row">
                      <ClipboardList className="h-[15px] w-[15px] text-[#B45309] flex-shrink-0 mt-0.5" strokeWidth={1.7} />
                      <span>
                        {mocNotifText(m, acts[0])}
                        <span className="topbar-panel-meta">{m.location} · {m.updatedAt}</span>
                      </span>
                    </Link>
                  ))}
                  {mocNotifs.length > 6 && (
                    <Link href="/moc" onClick={() => setNotifOpen(false)} className="topbar-panel-more">
                      Lihat {mocNotifs.length - 6} MOC lainnya
                    </Link>
                  )}
                  {overdueCount > 0 && (
                    <Link href="/dilemma" onClick={() => setNotifOpen(false)} className="topbar-panel-row">
                      <AlertTriangle className="h-[15px] w-[15px] text-[#DC2626] flex-shrink-0 mt-0.5" strokeWidth={1.7} />
                      <span><strong>{overdueCount} dokumen</strong> sudah lewat masa berlaku 5 tahun</span>
                    </Link>
                  )}
                  {totalNotifications === 0 && (
                    <div className="topbar-panel-row">
                      <CheckCircle2 className="h-[15px] w-[15px] text-[#15803D] flex-shrink-0" strokeWidth={1.7} />
                      <span>Tidak ada notifikasi baru saat ini.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="header-divider" />

        <div className="relative" ref={userRef}>
          <button className="profile-menu" onClick={() => setUserMenuOpen((v) => !v)} aria-label="Menu pengguna">
            <div className="avatar avatar-top">{activeUser.name.charAt(0)}</div>
            <div className="profile-copy">
              <strong>{activeUser.name}</strong>
              <span>{isPending ? "Menunggu Aktivasi" : activeUser.role}</span>
            </div>
            <ChevronDown className="profile-chevron h-3.5 w-3.5" strokeWidth={2} />
          </button>
          {userMenuOpen && (
            <div className="topbar-panel topbar-panel-narrow">
              <button className="topbar-panel-action" onClick={handleLogout}>
                <LogOut className="h-[15px] w-[15px] text-[#0F3B59]" strokeWidth={1.7} />
                <span>Keluar Sesi</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
