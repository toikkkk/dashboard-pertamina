"use client";

// Saran tanggal terbit untuk berkas yang baru dipilih user — dibaca LANGSUNG di browser
// (tanpa mengirim berkas ke server): teks halaman awal PDF digital (pdf.js), sel awal Excel
// (SheetJS), dan nama berkas. PDF hasil scan / gambar tidak punya teks yang bisa dibaca di
// sini (OCR di browser terlalu berat) → mengembalikan null dan user mengisi sendiri. Tanggal
// terakhir-diubah berkas SENGAJA tidak dipakai: itu tanggal salin, bukan tanggal dokumen.
import { suggestDateFromFilename, suggestDateFromText, type DateSuggestion } from "@/lib/domain/dateFromText";

const MAX_READ_BYTES = 40 * 1024 * 1024;

async function pdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // Worker disajikan statis dari /public (salinan versi pdfjs-dist yang sama) — kalau lewat bundler,
  // Terser gagal meminifikasinya saat build produksi. Perbarui salinan ini bila pdfjs-dist dinaikkan.
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  let text = "";
  for (let i = 1; i <= Math.min(doc.numPages, 3); i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += " " + content.items.map((it) => ("str" in it ? it.str : "")).join(" ");
    if (text.trim().length > 4000) break;
  }
  await doc.destroy();
  return text;
}

async function sheetText(file: File): Promise<string> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array", sheetRows: 40 });
  return wb.SheetNames.slice(0, 2).map((n) => XLSX.utils.sheet_to_csv(wb.Sheets[n])).join(" ");
}

/** Tanggal paling meyakinkan dari isi berkas, lalu nama berkas; null = tidak ada yang terbaca. */
export async function readDateSuggestion(file: File): Promise<DateSuggestion | null> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  let fromContent: DateSuggestion | null = null;
  if (file.size <= MAX_READ_BYTES) {
    try {
      if (ext === "pdf") fromContent = suggestDateFromText(await pdfText(file));
      else if (ext === "xlsx" || ext === "xls" || ext === "xlsm") fromContent = suggestDateFromText(await sheetText(file));
    } catch {
      fromContent = null; // berkas rusak/terkunci: lanjut ke nama berkas
    }
  }
  const fromName = suggestDateFromFilename(file.name);
  if (fromContent?.confidence === "pasti") return fromContent;
  if (fromName?.confidence === "pasti") return fromName;
  return fromContent ?? fromName;
}
