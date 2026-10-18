// Kode KBO untuk Nomor MoC (permintaan client 13 Okt 2026): format `AAA/MOC/PPNXXXXXXX/BB/TAHUN`.
//   AAA        = nomor urut 3 digit, mulai 001 dan di-reset per KBO per tahun
//   PPNXXXXXXX = kode KBO unit penerbit (dari "List KBO Jatimbalinus"); tiap lokasi dan tiap fungsi regional punya sendiri
//   BB         = bulan PENGAJUAN oleh Initiator, angka Romawi (I–XII)
//   TAHUN      = tahun pengajuan
// Contoh FT Malang (KBO PPNLL0207), diajukan Oktober 2026: 001/MOC/PPNLL0207/X/2026.
// Hanya kode jabatan (KBO) yang disimpan di sini; nama dan email pejabat sengaja tidak dimasukkan ke kode.
import { isRegionalUnit } from "./regionalUnit";

// Terminal: kode KBO tetap per lokasi. FT Larantuka memakai KBO FT Maumere, dan semua area IT Surabaya memakai
// satu KBO IT Surabaya (jawaban client 13 Okt 2026).
export const KBO_BY_LOCATION: Record<string, string> = {
  "AFT BIL": "PPNLL0103",
  "AFT Eltari": "PPNLL0104",
  "AFT Iswahyudi": "PND827000",
  "AFT Juanda": "PPNLL0101",
  "AFT Ngurah Rai": "PPNLL0102",
  "Bitumen Plant Gresik": "PPNGC0601",
  "FT Atapupu": "PPNLL0218",
  "FT Badas": "PPNLL0217",
  "FT Camplong": "PPNLL0212",
  "FT Ende": "PPNLL0216",
  "FT Kalabahi": "PPNLL0215",
  "FT Larantuka": "PPNLL0206",
  "FT Madiun": "PPNLL0208",
  "FT Malang": "PPNLL0207",
  "FT Maumere": "PPNLL0206",
  "FT Reo": "PPNLL0213",
  "FT Sanggaran": "PPNLL0209",
  "FT Tenau": "PPNLL0205",
  "FT Tuban": "PPNLL0203",
  "FT Waingapu": "PPNLL0214",
  "IT Ampenan": "PPNLL0210",
  "IT Bima": "PPNLL0211",
  "IT Manggis": "PPNLL0202",
  "IT Surabaya": "PPNLL0201",
  "IT Surabaya (Fuel)": "PPNLL0201",
  "IT Surabaya (LPG)": "PPNLL0201",
  "IT Surabaya (Bandaran)": "PPNLL0201",
  "IT Surabaya (Perak)": "PPNLL0201",
  "IT Tanjung Wangi": "PPNLL0204",
};

// Unit Regional: KBO ditentukan oleh fungsi pengusul (tiap fungsi regional punya KBO sendiri). Jabatan yang
// kosong (Vacant) tetap dipakai kodenya (jawaban client).
export const REGIONAL_KBO_FUNCTIONS: { label: string; kbo: string }[] = [
  { label: "HSSE Regional", kbo: "PPNLL0400" },
  { label: "Distribution Reliability & Engineering (DRE)", kbo: "PPNLL0300" },
  { label: "Supply & Distribution", kbo: "PPNLL0200" },
  { label: "Aviation", kbo: "PPNLL0100" },
  { label: "Retail Sales", kbo: "PPNEJ0200" },
  { label: "Corporate Sales", kbo: "PPNEJ0100" },
  { label: "SAM Industry", kbo: "PPNEJ0101" },
  { label: "SAM Petrochemical", kbo: "PPNEJ0102" },
  { label: "Relations & Project Development", kbo: "PND850000" },
  { label: "Asset Operation", kbo: "PPNEJ0300" },
  { label: "Finance", kbo: "PPNEJ0400" },
  { label: "Human Capital (HC)", kbo: "PPNEJ0500" },
  { label: "Legal Counsel", kbo: "PPNEJ0600" },
  { label: "Communication, Relations & CSR", kbo: "PPNEJ0700" },
  { label: "Medical", kbo: "PPNEJ0800" },
  { label: "Operation Risk", kbo: "PPNEJ0900" },
  { label: "IT Region", kbo: "PPNEJ1000" },
  { label: "Procurement", kbo: "PPNLL0500" },
  { label: "Internal Audit (IA)", kbo: "PPNAB0801" },
  { label: "Group Head Operation", kbo: "PPNLL0000" },
  { label: "Executive GM Regional", kbo: "PPNEJ0000" },
];

// KBO untuk sebuah MOC: terminal dari lokasinya, unit regional dari fungsi yang dipilih Initiator.
export function kboForMoc(location: string, fungsi: string): string | null {
  if (isRegionalUnit(location)) return REGIONAL_KBO_FUNCTIONS.find((f) => f.label === fungsi)?.kbo ?? null;
  return KBO_BY_LOCATION[location] ?? (location.startsWith("IT Surabaya") ? KBO_BY_LOCATION["IT Surabaya"] : null);
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
export const toRomanMonth = (month1to12: number): string => ROMAN[month1to12 - 1] ?? "";

// Bulan dan tahun menurut WIB (waktu pengguna), bukan UTC, supaya pengajuan tengah malam tidak bergeser bulan.
export function wibMonthYear(date: Date): { month: number; year: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "numeric" }).formatToParts(date);
  return {
    month: Number(parts.find((p) => p.type === "month")?.value),
    year: Number(parts.find((p) => p.type === "year")?.value),
  };
}

export function formatMocNumber(sequence: number, kbo: string, month1to12: number, year: number): string {
  return `${String(sequence).padStart(3, "0")}/MOC/${kbo}/${toRomanMonth(month1to12)}/${year}`;
}

// Mengambil nomor urut dari nomor berformat baru milik KBO dan tahun yang sama; null bila bukan format itu.
export function parseMocSequence(number: string | null, kbo: string, year: number): number | null {
  if (!number) return null;
  const m = /^(\d{3,})\/MOC\/([A-Z0-9]+)\/(?:I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\/(\d{4})$/.exec(number);
  return m && m[2] === kbo && Number(m[3]) === year ? Number(m[1]) : null;
}
