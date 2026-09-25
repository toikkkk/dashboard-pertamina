"use client";

// Bilah atas: pencarian nomor dokumen, hamburger mobile, notifikasi (bawaan dari
// Navbar lama), dan menu profil. DOM/kelas CSS porting dari desain Manus.
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bell, CheckCircle2, ClipboardList, Menu, Search } from "lucide-react";
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
  const { allDocuments } = usePsi();
  const router = useRouter();

  const [notifOpen, setNotifOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState(false);
  // Pencarian: ikon dulu; klik memperluas kolom input dengan transisi lebar (seperti
  // navbar lama). Menutup lagi saat klik di luar atau Escape, selama input kosong.
  const [searchOpen, setSearchOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLFormElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node) && !query) setSearchOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNotifOpen(false);
        setSearchOpen(false);
        setQuery("");
        setError(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [query]);

  const openSearch = () => {
    setSearchOpen(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const totalNotifications = overdueCount + mocNotifs.length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;
    const found = allDocuments.find((d) => d.documentNumber.toLowerCase() === q);
    if (found) {
      setError(false);
      setQuery("");
      setSearchOpen(false);
      router.push(`/document/${found.id}`);
      return;
    }
    setError(true);
  };

  return (
    <header className="topbar">
      <button className="mobile-menu" aria-label="Buka navigasi" onClick={() => setMobileOpen(true)}>
        <Menu className="h-5 w-5" />
      </button>

      {!isPending ? (
        <form ref={searchRef} onSubmit={handleSearch} className={`topbar-search ${searchOpen ? "topbar-search-open" : ""}`} role="search">
          <button
            type="button"
            aria-label={searchOpen ? "Cari nomor dokumen" : "Buka pencarian nomor dokumen"}
            aria-expanded={searchOpen}
            className="header-icon-button"
            onClick={() => (searchOpen && query ? handleSearch({ preventDefault() {} } as React.FormEvent) : searchOpen ? setSearchOpen(false) : openSearch())}
          >
            <Search className="h-[18px] w-[18px]" />
          </button>
          <label className="sr-only" htmlFor="doc-search">Cari nomor dokumen</label>
          <input
            id="doc-search"
            ref={searchInputRef}
            type="text"
            value={query}
            tabIndex={searchOpen ? 0 : -1}
            onChange={(e) => { setQuery(e.target.value); setError(false); }}
            placeholder="Cari nomor dokumen…"
            className="topbar-search-input"
          />
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
      </div>
    </header>
  );
}
