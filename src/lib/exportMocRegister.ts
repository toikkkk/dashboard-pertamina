"use client";

// Ekspor Register MOC ke Excel dengan 11 kolom persis Lampiran 8 TKO B13.3-07 ("Formulir MoC - Register MoC"),
// dibuat di browser dari daftar yang sedang tampil (mengikuti filter lokasi dan status). Tanggal diekspor sebagai
// tanggal Excel sungguhan. Lembar "Keterangan" memuat arti status perubahan.
import type { MocRequest } from "@/lib/domain/moc";
import { MOC_REGISTER_STATUSES } from "@/lib/domain/moc";

const toDate = (ts?: string | null): Date | "" => {
  if (!ts) return "";
  const d = new Date(ts.replace(" ", "T"));
  return isNaN(d.getTime()) ? "" : d;
};

export async function exportMocRegisterXlsx(mocs: MocRequest[], label: string) {
  const XLSX = await import("xlsx");
  const sorted = [...mocs].sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
  const rows = sorted.map((m, i) => ({
    "No.": i + 1,
    "No MOC": m.mocNumber ?? "",
    Lokasi: m.location,
    "Region/AP": m.region || "Jatimbalinus",
    "Type Anggaran": m.anggaranType,
    "Sifat Perubahan": m.sifatPerubahan,
    "Judul Perubahan": m.judul,
    "Alasan Perubahan": m.latarBelakang,
    "Deskripsi Perubahan": m.deskripsi,
    "Tgl. Perubahan Disetujui": toDate(m.approvedAt),
    "Status Perubahan": m.registerStatus,
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows, { cellDates: true });
  for (let r = 2; r <= rows.length + 1; r++) if (ws[`J${r}`]) ws[`J${r}`].z = "dd/mm/yyyy";
  ws["!cols"] = [{ wch: 5 }, { wch: 30 }, { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 50 }, { wch: 50 }, { wch: 60 }, { wch: 16 }, { wch: 20 }];
  ws["!autofilter"] = { ref: `A1:K${Math.max(rows.length + 1, 2)}` };
  XLSX.utils.book_append_sheet(wb, ws, "Register MOC");
  const legend = [
    ["*Keterangan"],
    ["Status Perubahan:"],
    ...MOC_REGISTER_STATUSES.map((s, i) => [`${i + 1}) ${s}`]),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(legend);
  ws2["!cols"] = [{ wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Keterangan");
  const today = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `Register-MOC-${label.replace(/[^\w-]+/g, "-")}-${today}.xlsx`);
}
