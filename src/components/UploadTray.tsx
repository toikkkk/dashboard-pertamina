"use client";

// Kartu progres unggahan kanan-bawah, meniru pola Google Drive: judul ringkas ("Mengunggah 2 item" /
// "3 unggahan selesai"), tombol ciutkan & tutup, satu baris per berkas dengan progres melingkar,
// centang saat selesai, batal saat berjalan, "Coba lagi" saat gagal. State ada di lib/uploadQueue.
import React, { useEffect } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, FileText, FileSpreadsheet, RotateCcw, X, AlertCircle } from "lucide-react";
import { cancelUpload, dismissUploads, retryUpload, toggleUploadTray, uploadsInFlight, useUploadQueue, type UploadItem } from "@/lib/uploadQueue";

function Ring({ value }: { value: number }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <circle cx="12" cy="12" r={r} fill="none" stroke="#E2E8EB" strokeWidth="3" />
      <circle
        cx="12" cy="12" r={r} fill="none" stroke="#0F3B59" strokeWidth="3" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - value)} transform="rotate(-90 12 12)"
        style={{ transition: "stroke-dashoffset 160ms linear" }}
      />
    </svg>
  );
}

function Row({ item }: { item: UploadItem }) {
  const sheet = /\.(xlsx?|xlsm|csv)$/i.test(item.name);
  const Icon = sheet ? FileSpreadsheet : FileText;
  const active = item.status === "mengunggah" || item.status === "menunggu" || item.status === "menyimpan";
  const sub =
    item.status === "gagal" ? item.error ?? "Gagal"
    : item.status === "batal" ? "Dibatalkan"
    : item.status === "menyimpan" ? "Menyimpan…"
    : item.status === "menunggu" ? "Menunggu"
    : item.status === "mengunggah" ? `${Math.round(item.progress * 100)}% · ${item.categoryName}`
    : item.categoryName;
  return (
    <li className="group flex items-center gap-3 px-4 py-2.5 hover:bg-[#F5F7F9]">
      <Icon className="w-[20px] h-[20px] flex-shrink-0" strokeWidth={1.6} style={{ color: sheet ? "#15803D" : "#DC2626" }} />
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-semibold text-[#0F172A] truncate" title={item.name}>{item.name}</div>
        <div className={`text-[11px] truncate ${item.status === "gagal" ? "text-[#DC2626] font-semibold" : "text-[#6b6e72]"}`} title={sub}>{sub}</div>
      </div>
      <div className="flex-shrink-0 w-6 flex items-center justify-center">
        {item.status === "selesai" ? (
          <CheckCircle2 className="w-5 h-5 text-[#15803D]" strokeWidth={2} aria-label="Selesai" />
        ) : item.status === "gagal" || item.status === "batal" ? (
          <button type="button" onClick={() => retryUpload(item.id)} aria-label={`Coba lagi ${item.name}`} title="Coba lagi" className="text-[#0F3B59] hover:bg-[#E2E8EB] rounded-full p-1">
            <RotateCcw className="w-4 h-4" strokeWidth={2.2} />
          </button>
        ) : item.status === "menunggu" ? (
          <span className="w-3 h-3 rounded-full border-2 border-[#C5CED3]" aria-label="Menunggu" />
        ) : item.status === "menyimpan" ? (
          <span className="w-4 h-4 rounded-full border-2 border-[#C5CED3] border-t-[#0F3B59] animate-spin" aria-label="Menyimpan" />
        ) : (
          <Ring value={item.progress} />
        )}
      </div>
      {active && item.status !== "menyimpan" && (
        <button type="button" onClick={() => cancelUpload(item.id)} aria-label={`Batalkan ${item.name}`} title="Batalkan" className="flex-shrink-0 text-[#9a9da0] hover:text-[#DC2626] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
          <X className="w-4 h-4" />
        </button>
      )}
    </li>
  );
}

export default function UploadTray() {
  const { items, minimized } = useUploadQueue();

  // Peringatan bila user menutup tab saat unggahan masih berjalan (byte belum seluruhnya terkirim).
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (uploadsInFlight()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  if (items.length === 0) return null;

  const active = items.filter((i) => i.status === "mengunggah" || i.status === "menunggu" || i.status === "menyimpan");
  const done = items.filter((i) => i.status === "selesai").length;
  const failed = items.filter((i) => i.status === "gagal").length;
  const overall = items.length ? items.reduce((s, i) => s + (i.status === "selesai" ? 1 : i.status === "mengunggah" ? i.progress : 0), 0) / items.length : 0;
  const title =
    active.length > 0 ? `Mengunggah ${active.length} item`
    : failed > 0 ? `${done} selesai, ${failed} gagal`
    : `${done} unggahan selesai`;

  return (
    <div
      role="region"
      aria-label="Progres unggahan"
      className="fixed z-[310] bottom-4 right-4 w-[min(360px,calc(100vw-2rem))] rounded-[14px] bg-white border border-[#D8E1E4] shadow-[0_12px_40px_-8px_rgba(15,23,42,.35)] overflow-hidden animate-fadeInUp"
    >
      <div className="flex items-center gap-2 pl-4 pr-2 py-2.5 bg-[#0F3B59] text-white">
        <div className="text-[13px] font-bold flex-1 min-w-0 truncate" aria-live="polite">{title}</div>
        <button type="button" onClick={toggleUploadTray} aria-label={minimized ? "Perbesar" : "Ciutkan"} className="p-1.5 rounded-full hover:bg-white/15">
          {minimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <button type="button" onClick={dismissUploads} aria-label="Tutup" title={active.length ? "Tutup (membatalkan unggahan yang berjalan)" : "Tutup"} className="p-1.5 rounded-full hover:bg-white/15">
          <X className="w-4 h-4" />
        </button>
      </div>
      {active.length > 0 && (
        <div className="h-[3px] bg-[#E2E8EB]">
          <div className="h-full bg-[#15803D]" style={{ width: `${Math.round(overall * 100)}%`, transition: "width 160ms linear" }} />
        </div>
      )}
      {!minimized && (
        <ul className="max-h-[300px] overflow-y-auto py-1">
          {items.map((i) => (
            <Row key={i.id} item={i} />
          ))}
        </ul>
      )}
      {failed > 0 && active.length === 0 && !minimized && (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-[#EEF2F4] text-[11.5px] text-[#B45309]">
          <AlertCircle className="w-3.5 h-3.5" /> Beberapa unggahan gagal — tekan ikon ulangi pada barisnya.
        </div>
      )}
    </div>
  );
}
