"use client";

// Popup "Lihat semua" generik dipakai oleh 3 panel dashboard (Segera Kedaluwarsa,
// Belum Diperbarui, Pembaruan Terbaru) — dibuat 2026-10-01 setelah masukan langsung:
// list yang di-expand DI TEMPAT (dalam halaman) bikin scroll kepanjangan begitu
// datanya ratusan baris. Solusinya: popup terpisah (createPortal, sama seperti
// CategoryPickerField/LocationPickerField) + grid ubin (gaya "kotak-kotak" yang
// sudah ada di Direktori, lihat DirectoryCategoryGrid.tsx) + PAGINASI halaman
// (bukan satu scroll tak berujung) — supaya tetap bisa "lihat semuanya", tapi
// tidak harus scroll ratusan baris sekaligus.
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 12;

export default function DashboardListModal<T>({
  open,
  onClose,
  title,
  items,
  renderTile,
  emptyLabel = "data",
  unit = "dokumen",
  pageSize = PAGE_SIZE,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  items: T[];
  renderTile: (item: T) => React.ReactNode;
  emptyLabel?: string;
  /** Satuan yang disebut di bawah judul (dokumen, terminal, ...). */
  unit?: string;
  pageSize?: number;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Reset ke halaman 1 tiap kali popup dibuka ulang — jangan nyangkut di halaman
  // terakhir yang pernah dibuka sebelumnya.
  useEffect(() => {
    if (open) setPage(0);
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const start = page * pageSize;
  const shown = items.slice(start, start + pageSize);

  return createPortal(
    <div
      className="fixed inset-0 bg-[rgba(29,45,61,.5)] flex items-center justify-center z-[300] p-5 animate-backdropIn"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-[760px] max-w-full max-h-[85vh] bg-white rounded-[14px] flex flex-col animate-modalPop overflow-hidden">
        <div className="flex items-center justify-between px-[22px] pt-[22px] pb-3.5 border-b border-[#eceded]">
          <div>
            <h3 className="font-heading text-lg font-bold text-[#0F172A]">{title}</h3>
            <p className="text-[11.5px] text-[#9a9da0] mt-0.5">{items.length} {unit}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="p-1.5 rounded-[8px] hover:bg-[#F5F7F9] transition-colors">
            <X className="w-4 h-4 text-[#6b6e72]" strokeWidth={1.8} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-[22px] py-4">
          {shown.length === 0 ? (
            <p className="text-center text-[12.5px] text-[#9a9da0] py-10">Belum ada {emptyLabel}.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {shown.map((item, i) => <React.Fragment key={i}>{renderTile(item)}</React.Fragment>)}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-[22px] py-3 border-t border-[#eceded]">
            <span className="text-[11.5px] text-[#6b6e72]">
              Menampilkan {start + 1}–{Math.min(start + pageSize, items.length)} dari {items.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-[8px] border border-[#C5CED3] bg-white hover:bg-[#F5F7F9] disabled:opacity-40 disabled:hover:bg-white transition-colors"
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft className="w-4 h-4 text-[#3a3d40]" strokeWidth={2} />
              </button>
              <span className="text-[11.5px] font-semibold text-[#3a3d40] min-w-[70px] text-center">
                Hal. {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-[8px] border border-[#C5CED3] bg-white hover:bg-[#F5F7F9] disabled:opacity-40 disabled:hover:bg-white transition-colors"
                aria-label="Halaman berikutnya"
              >
                <ChevronRight className="w-4 h-4 text-[#3a3d40]" strokeWidth={2} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
