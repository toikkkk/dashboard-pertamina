"use client";

// Bilah atas: pencarian nomor dokumen, hamburger mobile, notifikasi (bawaan dari
// Navbar lama), dan menu profil. DOM/kelas CSS porting dari desain Manus.
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bell, CheckCircle2, ClipboardList, Clock, Menu, Search } from "lucide-react";
import { usePsi } from "@/lib/psiStore";
import { mocPendingActions, type MocAction, type MocRequest } from "@/lib/domain/moc";
import { isDocOverdue, type DocumentItem } from "@/lib/mockData";
import { documentMatchScore } from "@/lib/domain/docSearch";

const mocNotifText = (m: MocRequest, a: MocAction): string => {
  if (a === "review") return `MOC "${m.judul || "tanpa judul"}" diajukan kepada Anda untuk direview`;
  if (a === "decide") return `MOC "${m.judul || "tanpa judul"}" menunggu keputusan Anda sebagai Approver`;
  if (a === "register") return `MOC "${m.judul || "tanpa judul"}" sudah disetujui dan menunggu registrasi Anda`;
  if (a === "communicate") return `MOC "${m.judul || "tanpa judul"}" sudah terdaftar — catat komunikasinya`;
  if (a === "planImplementation") return `MOC "${m.judul || "tanpa judul"}" menunggu rencana implementasi untuk Performer`;
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
  const { allDocuments, documents } = usePsi();
  const router = useRouter();

  const [notifOpen, setNotifOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
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

  // Pengingat kedaluwarsa (90/30 hari) untuk dokumen dalam cakupan user (lokasinya; admin = semua).
  // Hitungan hari terhadap tanggal berlaku; yang sudah lewat masuk baris "lewat masa berlaku" di bawah.
  const reminders = useMemo(() => {
    const now = Date.now();
    let d30 = 0;
    let d90 = 0;
    for (const d of documents) {
      if (isDocOverdue(d)) continue;
      const days = (Date.parse(`${d.expiryDate}T00:00:00`) - now) / 86400000;
      if (days <= 30) d30 += 1;
      else if (days <= 90) d90 += 1;
    }
    return { d30, d90 };
  }, [documents]);

  const totalNotifications = overdueCount + mocNotifs.length + reminders.d30 + reminders.d90;

  // Pencarian langsung (live) sambil mengetik, toleran typo — mis. mengetik "hazip"
  // tetap menampilkan dokumen "HAZOP" berkat skor kemiripan kata (bukan cuma substring
  // persis seperti sebelumnya). Menampilkan beberapa kandidat sekaligus di dropdown,
  // bukan cuma satu hasil terbaik, supaya user tidak perlu mengetik judul secara utuh.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return allDocuments
      .map((doc) => ({ doc, score: documentMatchScore(q, doc) }))
      .filter((r) => r.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((r) => r.doc);
  }, [query, allDocuments]);

  useEffect(() => setActiveIndex(0), [query]);

  const selectDocument = (doc: DocumentItem) => {
    setQuery("");
    setSearchOpen(false);
    setActiveIndex(0);
    router.push(`/document/${doc.id}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const target = results[activeIndex] ?? results[0];
    if (target) selectDocument(target);
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
            aria-label={searchOpen ? "Cari dokumen" : "Buka pencarian dokumen"}
            aria-expanded={searchOpen}
            className="header-icon-button"
            onClick={() => (searchOpen && query ? handleSearch({ preventDefault() {} } as React.FormEvent) : searchOpen ? setSearchOpen(false) : openSearch())}
          >
            <Search className="h-[18px] w-[18px]" />
          </button>
          <label className="sr-only" htmlFor="doc-search">Cari dokumen</label>
          <input
            id="doc-search"
            ref={searchInputRef}
            type="text"
            value={query}
            tabIndex={searchOpen ? 0 : -1}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              }
            }}
            placeholder="Cari nomor atau judul dokumen (mis. hazop, p&id juanda)…"
            autoComplete="off"
            role="combobox"
            aria-expanded={searchOpen && query.trim().length >= 2}
            aria-controls="doc-search-results"
            className="topbar-search-input"
          />
          {searchOpen && query.trim().length >= 2 && (
            <div className="topbar-search-results" id="doc-search-results" role="listbox">
              {results.length > 0 ? (
                results.map((doc, idx) => (
                  <button
                    key={doc.id}
                    type="button"
                    role="option"
                    aria-selected={idx === activeIndex}
                    className={`topbar-search-result-row${idx === activeIndex ? " topbar-search-result-row-active" : ""}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => selectDocument(doc)}
                  >
                    <span className="topbar-search-result-title">{doc.title}</span>
                    <span className="topbar-search-result-meta">
                      {doc.documentNumber} · {doc.location}
                      {doc.categoryName ? ` · ${doc.categoryName}` : ""}
                    </span>
                  </button>
                ))
              ) : (
                <div className="topbar-search-empty">Tidak ada dokumen yang mirip dengan &quot;{query}&quot;</div>
              )}
            </div>
          )}
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
                  {reminders.d30 > 0 && (
                    <Link href="/directory?aksi=segera" onClick={() => setNotifOpen(false)} className="topbar-panel-row">
                      <Clock className="h-[15px] w-[15px] text-[#DC2626] flex-shrink-0 mt-0.5" strokeWidth={1.7} />
                      <span><strong>{reminders.d30} dokumen</strong> berakhir dalam 30 hari</span>
                    </Link>
                  )}
                  {reminders.d90 > 0 && (
                    <Link href="/directory?aksi=segera" onClick={() => setNotifOpen(false)} className="topbar-panel-row">
                      <Clock className="h-[15px] w-[15px] text-[#B45309] flex-shrink-0 mt-0.5" strokeWidth={1.7} />
                      <span><strong>{reminders.d90} dokumen</strong> berakhir dalam 31–90 hari</span>
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
