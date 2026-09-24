"use client";

import { SHEET_CSS } from "@/components/MocSheet";
import type { MocRequest } from "@/lib/domain/moc";

// Unduhan formulir MoC. Tanpa dependensi: Word (.doc) dibuat dari HTML lembar (Word
// membuka HTML dengan tabel apa adanya, dapat diedit lalu ditandatangani), sedangkan PDF
// memakai dialog cetak browser (vektor, tata letak persis) dengan nama berkas yang sudah
// disiapkan lewat document.title.

export function mocFilename(moc: Pick<MocRequest, "mocNumber" | "judul">, base: string): string {
  const tag = moc.mocNumber ?? "draf";
  return `${base}_${tag}`.replace(/[^\w.-]+/g, "_");
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
    `<style>@page{size:A4;margin:12mm}body{margin:0}${SHEET_CSS}</style></head><body>${sheetHtml}</body></html>`;
  saveBlob(new Blob(["﻿", doc], { type: "application/msword;charset=utf-8" }), `${filename}.doc`);
}

// Buka dialog cetak dengan nama berkas yang sudah benar; pilih "Simpan sebagai PDF".
export function printAsPdf(filename: string) {
  const previous = document.title;
  document.title = filename;
  window.print();
  setTimeout(() => { document.title = previous; }, 1000);
}

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;

// Register MOC (Lampiran 8) sebagai CSV yang dapat dibuka di Excel (BOM UTF-8, pemisah koma).
export function downloadRegisterCsv(rows: MocRequest[], filename = "Register-MOC") {
  const head = ["No.", "No MOC", "Lokasi", "Region/AP", "Type Anggaran", "Sifat Perubahan", "Judul Perubahan", "Alasan Perubahan", "Deskripsi Perubahan", "Tgl. Perubahan Disetujui", "Status Perubahan"];
  const lines = [head.map(csvCell).join(",")];
  rows.forEach((m, i) => {
    lines.push(
      [i + 1, m.mocNumber ?? "", m.location, m.region, m.anggaranType, m.sifatPerubahan, m.judul, m.latarBelakang, m.deskripsi, m.approvedAt ? m.approvedAt.slice(0, 10) : "", m.registerStatus]
        .map(csvCell)
        .join(",")
    );
  });
  lines.push("", csvCell("Keterangan: Status Perubahan: 1) Inisiasi & Validasi; 2) Implementasi; 3) Pemantauan; 4) Tinjauan Akhir; 5) Closed"));
  saveBlob(new Blob(["﻿", lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
}
