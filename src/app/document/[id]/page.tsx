"use client";

import React, { useEffect, useState } from "react";
import ReviewButton from "@/components/ReviewButton";
import useSWR, { mutate as globalMutate } from "swr";
import { useRouter } from "next/navigation";
import DocumentSplitViewer from "@/components/DocumentSplitViewer";
import Breadcrumb, { type Crumb } from "@/components/Breadcrumb";
import Link from "next/link";
import { Archive, ChevronLeft, ChevronRight, FileLock2, FolderInput, Pencil, RefreshCw, Star, Trash2 } from "lucide-react";
import type { DocumentItem } from "@/lib/mockData";
import { usePsi } from "@/lib/psiStore";
import { useDocumentCategories } from "@/lib/useDocumentCategories";
import { recordOpened, useDocRefs } from "@/lib/recentDocs";
import MoveDocumentsDialog from "@/components/directory/MoveDocumentsDialog";
import ReplaceFileDialog from "@/components/directory/ReplaceFileDialog";
import EditDocumentDialog from "@/components/directory/EditDocumentDialog";
import DeleteDocumentDialog from "@/components/directory/DeleteDocumentDialog";
import { canDeleteDocument } from "@/lib/domain/rules";
import { psiInsights } from "@/lib/domain/dashboard";
import { supersededInfo } from "@/lib/domain/rules";
import SupersedeDialog from "@/components/directory/SupersedeDialog";
import DocumentMocCard from "@/components/DocumentMocCard";

// Deliberately does NOT read from usePsi()'s `allDocuments` (that list is an
// established, unfiltered exception for cross-location benchmarking widgets only —
// see CLAUDE.md). Looking up a single document by id needs the real RBAC check, so
// this fetches GET /api/documents/[id] directly, which 403s/404s server-side for a
// document outside the caller's location instead of trusting the client to have
// filtered correctly.
const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : null));

const barBtn =
  "inline-flex items-center gap-1.5 text-[12.5px] font-bold px-3.5 py-2 rounded-full border border-[#C5CED3] bg-white text-[#0F3B59] hover:bg-[#E2E8EB] transition-colors duration-150";

export default function DocumentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: doc, isLoading, mutate } = useSWR<DocumentItem | null>(`/api/documents/${params.id}`, fetcher);
  const { activeUser } = usePsi();
  const { categories, mutate: mutateCategories } = useDocumentCategories(doc?.location ?? null);
  const { isFav, toggleFav } = useDocRefs(activeUser.id);
  const [moveOpen, setMoveOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [supersedeOpen, setSupersedeOpen] = useState(false);
  const [undoBusy, setUndoBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Saudara satu sub-dokumen (urutan sama dengan tabel Direktori) untuk tombol sebelumnya/berikutnya.
  const siblings = categories.find((c) => c.id === doc?.categoryId)?.documents ?? [];
  const pos = doc ? siblings.findIndex((d) => d.id === doc.id) : -1;
  const prevId = pos > 0 ? siblings[pos - 1].id : null;
  const nextId = pos >= 0 && pos < siblings.length - 1 ? siblings[pos + 1].id : null;

  // "Terakhir dibuka": dicatat sekali per dokumen yang berhasil dimuat.
  useEffect(() => {
    if (!doc) return;
    recordOpened(activeUser.id, { id: doc.id, title: doc.title, location: doc.location, number: doc.documentNumber, category: doc.categoryName ?? null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id, activeUser.id]);

  // Panah kiri/kanan = dokumen sebelumnya/berikutnya (tidak aktif saat mengetik atau dialog terbuka).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (moveOpen || replaceOpen || editOpen || deleteOpen || e.altKey || e.ctrlKey || e.metaKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      if (e.key === "ArrowLeft" && prevId) router.push(`/document/${prevId}`);
      else if (e.key === "ArrowRight" && nextId) router.push(`/document/${nextId}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prevId, nextId, moveOpen, replaceOpen, editOpen, deleteOpen, router]);

  if (isLoading) {
    return <div className="py-14 text-center text-[12.5px] text-[#9a9da0]">Memuat dokumen…</div>;
  }

  if (!doc) {
    return (
      <div className="bg-white border border-[#D8E1E4] rounded-[12px] shadow-[0_2px_6px_rgba(15,23,42,.045)] py-[60px] px-5 text-center">
        <FileLock2 className="w-8 h-8 text-[#c3c6c9] mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-sm font-bold text-[#3a3d40] mb-1">Dokumen tidak ditemukan atau akses ditolak</p>
        <p className="text-[12.5px] text-[#9a9da0] mb-4">Dokumen mungkin tidak ada, atau berada di luar lokasi akses Anda.</p>
        <Link href="/directory" className="cursor-pointer text-[12.5px] font-bold text-[#0F3B59] hover:text-[#0B2C43]">
          ← Kembali ke Direktori
        </Link>
      </div>
    );
  }

  // Keyed by doc.id so navigating between two /document/[id] URLs (which Next.js
  // otherwise reuses the same component instance for, since it's the same route
  // pattern) fully remounts the viewer — resetting active tab, expanded history
  // rows, and any in-progress approve/reject comment draft instead of carrying
  // them over from whatever document was last viewed.
  // Jalur naik ke folder induk (Direktori › Lokasi › Sub-dokumen), seperti Google Drive.
  const canWrite = !!activeUser.isRegionalAdmin || activeUser.location === doc.location;
  // Dokumen ini termasuk "Perlu evaluasi tahunan"? Sama dengan hitungan dashboard (psiInsights), supaya konsisten.
  const staleItem = psiInsights([doc], Date.now()).stale[0];
  const staleInfo = staleItem
    ? {
        months: staleItem.months,
        date: new Date(staleItem.lastUpdate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
        color: staleItem.months >= 48 ? "#DC2626" : staleItem.months >= 24 ? "#C2410C" : "#B45309",
      }
    : null;
  const superseded = supersededInfo(doc);
  const undoSupersede = async () => {
    setUndoBusy(true);
    try {
      await fetch(`/api/documents/${doc.id}/supersede`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ undo: true }) });
      await mutate();
      void globalMutate("/api/bootstrap");
    } finally {
      setUndoBusy(false);
    }
  };
  const canDelete = canDeleteDocument(activeUser, doc.location);
  const loc = encodeURIComponent(doc.location);
  const crumbs: Crumb[] = [
    { label: "Direktori", href: "/directory" },
    { label: doc.location, href: `/directory?location=${loc}` },
  ];
  if (doc.categoryId && doc.categoryName) crumbs.push({ label: doc.categoryName, href: `/directory?location=${loc}&category=${doc.categoryId}` });
  crumbs.push({ label: doc.title });

  const ref = { id: doc.id, title: doc.title, location: doc.location, number: doc.documentNumber, category: doc.categoryName ?? null };
  const fav = isFav(doc.id);

  return (
    <>
      <Breadcrumb crumbs={crumbs} />
      <div className="flex flex-wrap items-center justify-between gap-2 -mt-1 mb-3">
        <div className="flex items-center gap-1.5 text-[12.5px] text-[#6b6e72]">
          {pos >= 0 && siblings.length > 1 ? (
            <>
              <button type="button" disabled={!prevId} onClick={() => prevId && router.push(`/document/${prevId}`)} aria-label="Dokumen sebelumnya (←)" title="Sebelumnya (←)" className="p-1.5 rounded-full border border-[#C5CED3] bg-white text-[#0F3B59] hover:bg-[#E2E8EB] disabled:opacity-40 disabled:hover:bg-white">
                <ChevronLeft className="w-4 h-4" strokeWidth={2.2} />
              </button>
              <span className="font-mono tabular-nums px-1">{pos + 1} / {siblings.length}</span>
              <button type="button" disabled={!nextId} onClick={() => nextId && router.push(`/document/${nextId}`)} aria-label="Dokumen berikutnya (→)" title="Berikutnya (→)" className="p-1.5 rounded-full border border-[#C5CED3] bg-white text-[#0F3B59] hover:bg-[#E2E8EB] disabled:opacity-40 disabled:hover:bg-white">
                <ChevronRight className="w-4 h-4" strokeWidth={2.2} />
              </button>
              <span className="hidden sm:inline ml-1 truncate max-w-[280px]">di {doc.categoryName}</span>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => toggleFav(ref)} aria-pressed={fav} className={barBtn}>
            <Star className="w-3.5 h-3.5" strokeWidth={2.2} fill={fav ? "#B45309" : "none"} style={{ color: fav ? "#B45309" : undefined }} />
            {fav ? "Favorit" : "Tandai favorit"}
          </button>
          {canWrite && (
            <>
              <button type="button" onClick={() => setReplaceOpen(true)} className={barBtn}>
                <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.2} /> Ganti berkas
              </button>
              {!superseded && (
                <button type="button" onClick={() => setSupersedeOpen(true)} className={barBtn}>
                  <Archive className="w-3.5 h-3.5" strokeWidth={2.2} /> Tandai digantikan
                </button>
              )}
              <button type="button" onClick={() => setEditOpen(true)} className={barBtn}>
                <Pencil className="w-3.5 h-3.5" strokeWidth={2.2} /> Ubah data
              </button>
              <button type="button" onClick={() => setMoveOpen(true)} className={barBtn}>
                <FolderInput className="w-3.5 h-3.5" strokeWidth={2.2} /> Pindahkan
              </button>
            </>
          )}
          {canDelete && (
            <button type="button" onClick={() => setDeleteOpen(true)} className={`${barBtn} !text-[#DC2626] hover:!bg-[#FEE2E2]`}>
              <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} /> Ke Sampah
            </button>
          )}
        </div>
      </div>
      {moveOpen && (
        <MoveDocumentsDialog
          categories={categories}
          ids={[doc.id]}
          currentCategoryId={doc.categoryId ?? null}
          onClose={() => setMoveOpen(false)}
          onMoved={() => {
            setMoveOpen(false);
            void mutate();
            void mutateCategories();
          }}
        />
      )}
      {editOpen && (
        <EditDocumentDialog
          documentId={doc.id}
          cycleMonths={categories.find((c) => c.id === doc.categoryId)?.reviewCycleMonths ?? 60}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            void mutate();
            void mutateCategories();
            void globalMutate("/api/bootstrap");
          }}
        />
      )}
      {deleteOpen && (
        <DeleteDocumentDialog
          documentId={doc.id}
          title={doc.title}
          number={doc.documentNumber}
          onClose={() => setDeleteOpen(false)}
          onDeleted={() => {
            void globalMutate("/api/bootstrap");
            router.push(doc.categoryId ? `/directory?location=${loc}&category=${doc.categoryId}` : `/directory?location=${loc}`);
          }}
        />
      )}
      {supersedeOpen && (
        <SupersedeDialog
          doc={doc}
          onClose={() => setSupersedeOpen(false)}
          onDone={() => {
            setSupersedeOpen(false);
            void mutate();
            void globalMutate("/api/bootstrap");
          }}
        />
      )}
      {replaceOpen && (
        <ReplaceFileDialog
          documentId={doc.id}
          title={doc.title}
          currentVersion={doc.currentVersion}
          onClose={() => setReplaceOpen(false)}
          onDone={() => {
            setReplaceOpen(false);
            void mutate();
            void mutateCategories();
            void globalMutate("/api/bootstrap");
          }}
        />
      )}
      {superseded && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border bg-white px-4 py-3" style={{ borderColor: "#6b6e72", borderLeftWidth: 4 }} role="status">
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-[#0F172A]">Digantikan</div>
            <div className="text-[12px] text-[#3a3d40]">
              {superseded.text}
              {superseded.byId && (
                <>
                  {" "}
                  <Link href={`/document/${superseded.byId}`} className="font-semibold text-[#0F3B59] hover:underline">Buka dokumen pengganti</Link>
                </>
              )}
            </div>
          </div>
          {canWrite && (
            <button type="button" onClick={undoSupersede} disabled={undoBusy} className={barBtn}>
              {undoBusy ? "Memproses…" : "Aktifkan kembali"}
            </button>
          )}
        </div>
      )}
      {staleInfo && (
        <div
          className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border bg-white px-4 py-3"
          style={{ borderColor: staleInfo.color, borderLeftWidth: 4 }}
          role="status"
        >
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-[#0F172A]">Perlu evaluasi tahunan</div>
            <div className="text-[12px] text-[#3a3d40]">
              Terakhir diperbarui <b>{staleInfo.date}</b> ({staleInfo.months} bln lalu). Apakah dokumen ini masih valid?
            </div>
          </div>
          {canWrite && (
            <div className="flex items-center gap-2 flex-wrap">
              <ReviewButton docId={doc.id} location={doc.location} onDone={() => { void mutate(); void globalMutate("/api/bootstrap"); }} className="!py-[7px] !text-[12.5px]" />
              <button type="button" onClick={() => setReplaceOpen(true)} className={barBtn}>
                <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.2} /> Perlu diperbarui
              </button>
            </div>
          )}
        </div>
      )}
      <DocumentMocCard documentId={doc.id} />
      <DocumentSplitViewer document={doc} key={doc.id} />
    </>
  );
}
