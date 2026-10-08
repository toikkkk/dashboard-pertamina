"use client";

// Ekspor Direktori ke Excel (dibuat di browser dari data yang sudah dimuat — tanpa panggilan server baru).
// Tiga lembar: "Dokumen" (satu baris per dokumen, urut Lokasi › cluster Excel › nomor sub-dokumen), "Belum ada
// dokumen" (sub-dokumen Excel yang kosong per lokasi), dan "Ringkasan" per lokasi. Tanggal diekspor sebagai
// tanggal Excel sungguhan (bisa disaring/diurutkan), dokumen bertanda perkiraan diberi kolom "Catatan tanggal".
import type { DocumentItem } from "@/lib/domain/types";
import type { DirectoryOverview } from "@/lib/useDocumentCategories";
import { PSI_CHAPTERS, PSI_EXTRA_PLACEMENT, psiSubDocumentByName } from "@/lib/domain/psiSubChapters";

const toDate = (iso: string) => new Date(`${iso}T00:00:00`);
const chapterTitle = (key: string | null) => {
  const ch = PSI_CHAPTERS.find((c) => c.key === key);
  return ch ? `${ch.label} · ${ch.title}` : "Dokumen Lainnya";
};
const chapterIndex = (key: string | null) => {
  const i = PSI_CHAPTERS.findIndex((c) => c.key === key);
  return i < 0 ? PSI_CHAPTERS.length : i;
};

export async function exportDirectoryXlsx(opts: { docs: DocumentItem[]; overview: DirectoryOverview | null; label: string }) {
  const XLSX = await import("xlsx");
  const today = new Date().toISOString().split("T")[0];

  const rows = opts.docs
    .map((d) => {
      const ex = d.categoryName ? psiSubDocumentByName(d.categoryName) : null;
      const chapter = ex?.chapter ?? (d.categoryName ? PSI_EXTRA_PLACEMENT[d.categoryName] ?? null : null);
      const estimated = d.history.some((h) => (h.notes ?? "").includes("tanggal terbit perkiraan"));
      return {
        _loc: d.location,
        _ch: chapterIndex(chapter),
        _no: ex?.no ?? 999,
        row: {
          Lokasi: d.location,
          Cluster: chapterTitle(chapter),
          "No.": ex?.no ?? "",
          "Sub-dokumen": d.categoryName ?? "(tanpa sub-dokumen)",
          "Nomor Dokumen": d.documentNumber,
          Judul: d.title,
          Versi: d.currentVersion,
          "Tanggal Terbit": toDate(d.issueDate),
          "Berlaku Sampai": toDate(d.expiryDate),
          Status: d.expiryDate < today ? "Kedaluwarsa" : "Berlaku",
          "Catatan tanggal": estimated ? "Tanggal terbit perkiraan (belum diverifikasi)" : "",
        },
      };
    })
    .sort((a, b) => a._loc.localeCompare(b._loc) || a._ch - b._ch || a._no - b._no || a.row.Judul.localeCompare(b.row.Judul, "id", { numeric: true }))
    .map((r) => r.row);

  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.json_to_sheet(rows, { cellDates: true });
  const dateCols = ["H", "I"];
  for (let r = 2; r <= rows.length + 1; r++) for (const c of dateCols) if (ws1[`${c}${r}`]) ws1[`${c}${r}`].z = "dd/mm/yyyy";
  ws1["!cols"] = [{ wch: 22 }, { wch: 38 }, { wch: 5 }, { wch: 44 }, { wch: 24 }, { wch: 60 }, { wch: 8 }, { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 40 }];
  ws1["!autofilter"] = { ref: `A1:K${Math.max(rows.length + 1, 2)}` };
  XLSX.utils.book_append_sheet(wb, ws1, "Dokumen");

  const locs = new Set(opts.docs.map((d) => d.location));
  if (opts.overview) {
    const ov = opts.overview;
    const inScope = ov.locations.filter((l) => locs.has(l.name) || opts.label === l.name).map((l) => l.name);
    const empty: Record<string, string | number>[] = [];
    for (const name of inScope) {
      for (const it of ov.items) {
        if ((ov.cells[name]?.[it.name]?.n ?? 0) === 0) empty.push({ Lokasi: name, Cluster: chapterTitle(it.chapter), "No.": it.no, "Sub-dokumen": it.name });
      }
    }
    const ws2 = XLSX.utils.json_to_sheet(empty.length ? empty : [{ Lokasi: "", Cluster: "", "No.": "", "Sub-dokumen": "Semua sub-dokumen sudah ada dokumennya" }]);
    ws2["!cols"] = [{ wch: 22 }, { wch: 38 }, { wch: 5 }, { wch: 60 }];
    ws2["!autofilter"] = { ref: `A1:D${Math.max(empty.length + 1, 2)}` };
    XLSX.utils.book_append_sheet(wb, ws2, "Belum ada dokumen");

    const summary = inScope.map((name) => {
      const ds = opts.docs.filter((d) => d.location === name);
      const l = ov.locations.find((x) => x.name === name)!;
      const in90 = ds.filter((d) => d.expiryDate >= today && (Date.parse(`${d.expiryDate}T00:00:00`) - Date.now()) / 86400000 <= 90).length;
      return {
        Lokasi: name,
        "Jumlah dokumen": ds.length,
        [`Sub-dokumen terisi (dari ${ov.items.length})`]: l.filled,
        "Sub-dokumen terpenuhi (berlaku)": l.ok,
        Kedaluwarsa: ds.filter((d) => d.expiryDate < today).length,
        "Berakhir ≤ 90 hari": in90,
        "Tanggal perkiraan": ds.filter((d) => d.history.some((h) => (h.notes ?? "").includes("tanggal terbit perkiraan"))).length,
      };
    });
    const ws3 = XLSX.utils.json_to_sheet(summary);
    ws3["!cols"] = [{ wch: 24 }, { wch: 15 }, { wch: 26 }, { wch: 30 }, { wch: 13 }, { wch: 17 }, { wch: 17 }];
    XLSX.utils.book_append_sheet(wb, ws3, "Ringkasan");
  }

  const safe = opts.label.replace(/[^\w\-]+/g, "_");
  XLSX.writeFile(wb, `Direktori-PSI_${safe}_${today}.xlsx`, { cellDates: true });
  return rows.length;
}
