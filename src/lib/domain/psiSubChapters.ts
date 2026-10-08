// Struktur sub-dokumen Direktori — SUMBER TUNGGAL: Excel client
// "PSI_First_Column_SubChapter_A_B_1_2_3_4_5.xlsx" (revisi 2026-10-07: sub-dokumen di Direktori
// harus sama persis dengan Excel itu — nama, jumlah, dan cluster/sub-chapter-nya).
// JANGAN ubah nama/urutan di sini tanpa perubahan di Excel; nama dipakai apa adanya sebagai
// nama kategori di database (document_categories.name).

export interface PsiChapter {
  key: string; // "A" | "B.1" … "B.5"
  label: string; // "Sub Chapter A" | "Sub Chapter B"
  title: string;
}

export interface PsiSubDocument {
  chapter: string;
  no: number;
  name: string;
  /** Kolom "Keterangan" di Excel, apa adanya (mis. "N/A"). */
  keterangan: string | null;
  /** Nama kategori lama sebelum disamakan dengan Excel — dipakai skrip migrasi data saja. */
  legacyName: string | null;
}

export const PSI_CHAPTERS: PsiChapter[] = [
  { key: "A", label: "Sub Chapter A", title: "Dokumen Informasi Bahan Berbahaya (Hazardous Material)" },
  { key: "B.1", label: "Sub Chapter B", title: "1. Dokumen Design & Technology" },
  { key: "B.2", label: "Sub Chapter B", title: "2. Dokumen Process Operation" },
  { key: "B.3", label: "Sub Chapter B", title: "3. Dokumen Process Safety Study" },
  { key: "B.4", label: "Sub Chapter B", title: "4. Dokumen Emergency Preparedness" },
  { key: "B.5", label: "Sub Chapter B", title: "5. Dokumen Perizinan dan Pengelolaan Lingkungan" },
];

export const PSI_SUB_DOCUMENTS: PsiSubDocument[] = [
  { chapter: "A", no: 1, name: "Safety Data Sheet (SDS) Produk BBM/BBK/LPG (mandatory)", keterangan: null, legacyName: "SDS Produk BBM/BBK/LPG" },
  { chapter: "A", no: 2, name: "Dokumen informasi bahan berbahaya, Safety Data Sheet (SDS) Register untuk material selain produk PT Pertamina Group (mandatory)", keterangan: null, legacyName: null },
  { chapter: "B.1", no: 1, name: "Process Description", keterangan: "N/A", legacyName: null },
  { chapter: "B.1", no: 2, name: "Design Basis", keterangan: null, legacyName: "Design Basis" },
  { chapter: "B.1", no: 3, name: "Operation & Control Philosophy (mandatory)", keterangan: null, legacyName: "Operation & Control Philosophy" },
  { chapter: "B.1", no: 4, name: "Block Flow Diagram / Schematic Diagram", keterangan: "N/A", legacyName: null },
  { chapter: "B.1", no: 5, name: "Heat and Material Balance", keterangan: null, legacyName: "Heat and Material Balance" },
  { chapter: "B.1", no: 6, name: "Process Flow Diagram (PFD) (mandatory)", keterangan: null, legacyName: "PFD (Process Flow Diagram)" },
  { chapter: "B.1", no: 7, name: "Piping and Instrumentation Diagram (P&ID)", keterangan: null, legacyName: "P&ID" },
  { chapter: "B.1", no: 8, name: "Equipment Sizing Calculation (Pipa, PSV, Pipa Relief, Vent/Flare, Control Valve, Pompa, Bejana Bertekanan/Tangki Timbun dan lain-lain)", keterangan: null, legacyName: "Equipment Sizing Calculation" },
  { chapter: "B.1", no: 9, name: "Cause and Effect Diagram, Safety Analysis Function Evaluation (SAFE) Chart", keterangan: null, legacyName: "Cause & Effect / SAFE Chart" },
  { chapter: "B.1", no: 10, name: "Safety and Fire Fighting Equipment Layout and Escape Way", keterangan: null, legacyName: null },
  { chapter: "B.1", no: 11, name: "Firewater Network and Deluge System Hydraulic Calculation", keterangan: "N/A", legacyName: null },
  { chapter: "B.1", no: 12, name: "Fire and Gas Detection Layout", keterangan: null, legacyName: "Fire and Gas Detection Layout" },
  { chapter: "B.1", no: 13, name: "Perhitungan kebutuhan bundwall dan design", keterangan: null, legacyName: "Perhitungan Bundwall" },
  { chapter: "B.1", no: 14, name: "Overpressure Protection, Relief System and Flare/Vent Study", keterangan: "N/A", legacyName: null },
  { chapter: "B.1", no: 15, name: "Lightning & Surge Protection Study", keterangan: null, legacyName: "Lightning & Surge Protection Study (LPS)" },
  { chapter: "B.1", no: 16, name: "Single Line Diagram (SLD)", keterangan: null, legacyName: "Single Line Diagram (SLD)" },
  { chapter: "B.1", no: 17, name: "Wiring and Connection Diagram", keterangan: null, legacyName: "Wiring and Connection Diagram" },
  { chapter: "B.1", no: 18, name: "Electrical HAZOP", keterangan: "N/A", legacyName: null },
  { chapter: "B.1", no: 19, name: "Electrical Calculation. Contoh: Ukuran kabel (Cable Sizing), Analisis Beban (Load Analysis), dan lain-lain", keterangan: "N/A", legacyName: null },
  { chapter: "B.1", no: 20, name: "Electrical Equipment List", keterangan: null, legacyName: "Electrical Equipment List" },
  { chapter: "B.1", no: 21, name: "Electrical Equipment Specification", keterangan: "N/A", legacyName: null },
  { chapter: "B.1", no: 22, name: "Instrument and Control Philosophy", keterangan: "N/A", legacyName: null },
  { chapter: "B.1", no: 23, name: "Instrument Equipment Specification & Calculation", keterangan: "N/A", legacyName: null },
  { chapter: "B.1", no: 24, name: "Instrument Data Sheet (SDV, Pressure/Temperature/Level Gauge, Pressure/Temperature/Level Transmitter/Switch, PSV, Control Valve, Fire & Gas Detector, Flow Indicator dan lain-lain)", keterangan: null, legacyName: "Instrument Data Sheet" },
  { chapter: "B.1", no: 25, name: "Studi Sistem Pentanahan (Grounding), termasuk Bonding dan Sistem Proteksi Petir (Lightning Protection)", keterangan: null, legacyName: "Studi Sistem Pentanahan (Grounding)" },
  { chapter: "B.1", no: 26, name: "Grounding Layout dan Cable", keterangan: "N/A", legacyName: null },
  { chapter: "B.1", no: 27, name: "Study Stuktural Tanah dan Bangunan", keterangan: "N/A", legacyName: null },
  { chapter: "B.2", no: 1, name: "Safe Operating Limit / Safe Operating Envelop (SOL/SOE)", keterangan: null, legacyName: "Safe Operating Limit / Envelope (SOL/SOE)" },
  { chapter: "B.2", no: 2, name: "Operating Manual, Daftar Alarm dan Interlock", keterangan: null, legacyName: "Operating Manual & Daftar Alarm/Interlock" },
  { chapter: "B.2", no: 3, name: "Prosedur Startup dan Shutdown", keterangan: null, legacyName: "Prosedur Startup & Shutdown" },
  { chapter: "B.2", no: 4, name: "Prosedur Penanganan Abnormal dan Darurat", keterangan: null, legacyName: "Prosedur Penanganan Abnormal & Darurat" },
  { chapter: "B.2", no: 5, name: "Tabel Tangki", keterangan: null, legacyName: null },
  { chapter: "B.2", no: 6, name: "Vendor Data (Operating & Maintenance Manual)", keterangan: null, legacyName: null },
  { chapter: "B.2", no: 7, name: "Sertifikat Inspeksi Peralatan / COI, PLO", keterangan: null, legacyName: null },
  { chapter: "B.3", no: 1, name: "Hazardous Area Classification (HAC) lay out", keterangan: null, legacyName: "HAC Layout" },
  { chapter: "B.3", no: 2, name: "Hazardous Area Classification (HAC) Schedule", keterangan: null, legacyName: "HAC Schedule" },
  { chapter: "B.3", no: 3, name: "Major Accident Hazard (MAH) Study and Register", keterangan: null, legacyName: "MAH Study & Register" },
  { chapter: "B.3", no: 4, name: "SECE Study dan SECE Register", keterangan: null, legacyName: "SECE Study & Register" },
  { chapter: "B.3", no: 5, name: "Bow Tie", keterangan: null, legacyName: "Bow Tie" },
  { chapter: "B.3", no: 6, name: "Quantitative Risk Assessment (QRA)", keterangan: null, legacyName: "QRA (Quantitative Risk Assessment)" },
  { chapter: "B.3", no: 7, name: "Fire and Explosion Risk Assessment (FERA)", keterangan: null, legacyName: "FERA (Fire and Explosion Risk Assessment)" },
  { chapter: "B.3", no: 8, name: "Emergency Evacuation Rescue Analysis (EERA)", keterangan: "N/A", legacyName: null },
  { chapter: "B.3", no: 9, name: "Building Risk Assessment Study Report", keterangan: "N/A", legacyName: null },
  { chapter: "B.4", no: 1, name: "Incident Risk Card - Mandatory", keterangan: null, legacyName: "Incident Risk Card" },
  { chapter: "B.4", no: 2, name: "Fire Risk Card - Mandatory", keterangan: null, legacyName: "Fire Risk Card" },
  { chapter: "B.4", no: 3, name: "Pre-Fire Planning (kebutuhan fire water, foam) – Mandatory", keterangan: null, legacyName: "Pre-Fire Planning" },
  { chapter: "B.4", no: 4, name: "Emergency response Plan – Mandatory", keterangan: null, legacyName: "Emergency Response Plan" },
  { chapter: "B.4", no: 5, name: "Oil Spill Contingency Planning (OSCP)", keterangan: "Dokumen dilakukan tinjauan dalam 2 tahun, apabila ada peruban diperlukan update dokumen", legacyName: "OSCP (Oil Spill Contingency Planning)" },
  { chapter: "B.4", no: 6, name: "Safety and Fire Fighting Equipment List", keterangan: null, legacyName: null },
  { chapter: "B.5", no: 1, name: "Dokumen Lingkungan (AMDAL, UKL/ UPL, DELH, DPLH)", keterangan: null, legacyName: "Dokumen Lingkungan (AMDAL/UKL-UPL/DELH/DPLH)" },
  { chapter: "B.5", no: 2, name: "Environmental Protection System Equipment & Layout", keterangan: "N/A", legacyName: null },
];

const BY_NAME = new Map(PSI_SUB_DOCUMENTS.map((s) => [s.name, s]));
const CHAPTER_ORDER = new Map(PSI_CHAPTERS.map((c, i) => [c.key, i]));

/** Info Excel untuk sebuah nama kategori; null = kategori di luar daftar Excel (kustom). */
// Kategori di luar Excel yang oleh client ditetapkan masuk ke Sub Chapter B (2026-10-08: "HAZID dan HAZOP
// masuk di sub B"). Tampil sebagai ubin tambahan tanpa nomor di cluster itu; TIDAK mengubah 53 item Excel
// dan tidak dihitung di kepatuhan (tetap kategori kustom). Kunci = nama kategori persis.
export const PSI_EXTRA_PLACEMENT: Record<string, string> = {
  "HAZID & HAZOP Study": "B.3",
};

export function psiSubDocumentByName(name: string): PsiSubDocument | null {
  return BY_NAME.get(name) ?? null;
}

/** Urutan tampil: cluster Excel dulu (sesuai urutan Excel), lalu kategori lain. */
export function psiSortKey(name: string): number {
  const s = BY_NAME.get(name);
  if (!s) return 10_000;
  return (CHAPTER_ORDER.get(s.chapter) ?? 99) * 100 + s.no;
}

/** Judul tampil sebuah cluster, mis. "Sub Chapter B · 3. Dokumen Process Safety Study". */
export function psiChapterHeading(c: PsiChapter): { prefix: string; title: string } {
  return { prefix: c.label, title: c.title };
}
