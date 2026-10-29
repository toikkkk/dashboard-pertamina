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

const CRLF = String.fromCharCode(13, 10);

// Base64 (76 kolom per baris) dari teks UTF-8 — dipakai untuk bagian HTML pada berkas MHTML.
function utf8Base64Lines(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  return (btoa(bin).match(/.{1,76}/g) ?? []).join(CRLF);
}

export function downloadSheetAsWord(sheetHtml: string, filename: string) {
  // Gambar data: URI TIDAK ditampilkan Word saat membuka HTML (logo hilang, dilaporkan 2026-10-29). Karena itu
  // setiap gambar dipindah menjadi bagian MIME terpisah (format "Halaman Web Satu Berkas"/MHTML, yang juga
  // dipakai Word sendiri saat Save As Single File Web Page) dan <img> menunjuk ke bagian itu.
  const images: { location: string; mime: string; base64: string }[] = [];
  const html = sheetHtml.replace(/src="data:(image\/[a-z+.-]+);base64,([^"]+)"/gi, (_m, mime: string, b64: string) => {
    const location = `file:///C:/moc/gambar${images.length + 1}.${mime.split("/")[1].replace("jpeg", "jpg")}`;
    images.push({ location, mime, base64: b64 });
    return `src="${location}"`;
  });
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
    `<body><div class="Section1">${html}</div></body></html>`;
  const boundary = "----=_NextPart_moc_" + Math.random().toString(36).slice(2);
  const parts = [
    "MIME-Version: 1.0",
    `Content-Type: multipart/related; boundary="${boundary}"; type="text/html"`,
    "",
    `--${boundary}`,
    "Content-Location: file:///C:/moc/formulir.htm",
    "Content-Transfer-Encoding: base64",
    'Content-Type: text/html; charset="utf-8"',
    "",
    utf8Base64Lines(doc),
    ...images.flatMap((img) => [
      "",
      `--${boundary}`,
      `Content-Location: ${img.location}`,
      "Content-Transfer-Encoding: base64",
      `Content-Type: ${img.mime}`,
      "",
      (img.base64.match(/.{1,76}/g) ?? []).join(CRLF),
    ]),
    "",
    `--${boundary}--`,
    "",
  ];
  saveBlob(new Blob([parts.join(CRLF)], { type: "application/msword" }), `${filename}.doc`);
}

// Buka dialog cetak dengan nama berkas yang sudah benar; pilih "Simpan sebagai PDF".
export function printAsPdf(filename: string) {
  const previous = document.title;
  document.title = filename;
  window.print();
  setTimeout(() => { document.title = previous; }, 1000);
}
