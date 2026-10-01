"use client";

import { SHEET_CSS } from "@/components/MocSheet";
import type { MocRequest } from "@/lib/domain/moc";

// Unduhan formulir MoC. Tanpa dependensi: Word (.doc) dibuat dari HTML lembar (Word
// membuka HTML dengan tabel apa adanya, dapat diedit lalu ditandatangani), sedangkan PDF
// memakai dialog cetak browser (vektor, tata letak persis) dengan nama berkas yang sudah
// disiapkan lewat document.title.

// Stempel waktu WAJIB ada di nama berkas draf (belum ada Nomor MoC) — tanpa ini
// setiap unduhan draf menghasilkan nama file yang PERSIS SAMA, jadi browser cuma
// menumpuk "..._draf (1).doc", "..._draf (2).doc", dst., dan gampang sekali salah
// buka file lama yang isinya belum berisi perbaikan terbaru (ini nyata terjadi
// saat debugging sesi ini — pengguna melapor "masih sama" padahal isi file yang
// baru sebenarnya sudah benar, ternyata yang dibuka bukan unduhan terbaru).
export function mocFilename(moc: Pick<MocRequest, "mocNumber" | "judul">, base: string): string {
  if (moc.mocNumber) return `${base}_${moc.mocNumber}`.replace(/[^\w.-]+/g, "_");
  const now = new Date();
  const stamp = [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((n) => String(n).padStart(2, "0")).join("")
    + "-" + [now.getHours(), now.getMinutes(), now.getSeconds()].map((n) => String(n).padStart(2, "0")).join("");
  return `${base}_draf_${stamp}`.replace(/[^\w.-]+/g, "_");
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadSheetAsWord(sheetHtml: string, filename: string) {
  const doc =
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">` +
    `<head><meta charset="utf-8"><title>${filename}</title>` +
    `<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->` +
    `<style>` +
    // Page setup lewat pola NATIF Word ("@page SectionN{...}" + "div.SectionN{page:SectionN}"
    // + properti ber-awalan mso-), BUKAN cuma @page CSS generik seperti sebelumnya — ini
    // literalnya format yang Word SENDIRI tulis kalau Anda "Save As > Web Page, Filtered"
    // dari Word asli, jadi jauh lebih pasti dihormati dibanding @page CSS biasa (yang
    // terbukti berkali-kali diabaikan Word untuk hal lain di lembar ini — position,
    // float, ukuran gambar, flexbox). Satuan pt (satuan asli Word), bukan in/mm. A4 =
    // 595.3pt x 841.9pt. Margin atas/bawah 54pt (0.75in), kiri/kanan 18pt (0.25in),
    // header/footer 21.6pt (0.3in) — persis page setup asli Form MoC 2025.xlsx.
    `@page Section1{size:595.3pt 841.9pt;margin:54.0pt 18.0pt 54.0pt 18.0pt;mso-header-margin:21.6pt;mso-footer-margin:21.6pt;mso-paper-source:0}` +
    `div.Section1{page:Section1}` +
    `body{margin:0}${SHEET_CSS}</style></head>` +
    `<body><div class="Section1">${sheetHtml}</div></body></html>`;
  saveBlob(new Blob(["﻿", doc], { type: "application/msword;charset=utf-8" }), `${filename}.doc`);
}

// Buka dialog cetak dengan nama berkas yang sudah benar; pilih "Simpan sebagai PDF".
export function printAsPdf(filename: string) {
  const previous = document.title;
  document.title = filename;
  window.print();
  setTimeout(() => { document.title = previous; }, 1000);
}
