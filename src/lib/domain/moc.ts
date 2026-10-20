// Management of Change (MOC) — tipe, konstanta, dan aturan murni. Tanpa React/DOM,
// aman diimpor klien maupun API route (pola yang sama dengan rules.ts).
// Sumber: TKO B13.3-07/PNA400000/2025-S9. Tahap A-C (Inisiasi, Penilaian Risiko,
// Validasi) lengkap; D Komunikasi + E.1 Rencana Implementasi menjadi gerbang sebelum
// Implementasi (PRD .claude/prds/moc-tahap-lanjut.prd.md, milestone 1). Tahap E-H
// sesudahnya masih dimajukan manual lewat `advance` sampai milestone berikutnya.

import { isRegionalUnit } from "./regionalUnit";
import { REGIONAL_KBO_FUNCTIONS } from "./kbo";

// 13 kotak "Aktivitas / Ruang Lingkup Perubahan" pada Formulir Lampiran 5, urutan
// sesuai formulir. (Sama dengan 13 baris Tabel 1 TKO; "Sistem/aplikasi teknologi"
// adalah Scope 13 pada Tabel 3 — menambah Fungsi IT sebagai reviewer.)
// Kata-kata & urutan dicocokkan persis ke "Form MoC 2025.xlsx" (Form Pengusulan
// dan Validasi, baris 9-11) 2026-09-30 — sumber resmi yang sebelumnya cuma
// direkonstruksi dari teks TKO, sekarang diverifikasi ke formulir asli.
export const MOC_CHANGE_CATEGORIES = [
  "Penambahan Fasilitas Baru",
  "Akuisisi",
  "Modifikasi rekayasa / engineering",
  "Perubahan diluar rancangan",
  "Downgrade situation",
  "Penggunaan B3 baru",
  "Perubahan Instrumen / Alarm",
  "Kelebihan Aset",
  "Perubahan peralatan instalasi",
  "Perubahan gedung / struktur",
  "Sistem / aplikasi / teknologi / metode kerja baru",
  "Perubahan sumber bahan baku / pemasok",
  "Penggantian peralatan / komponen bukan inkind replacement",
] as const;
export type MocChangeCategory = (typeof MOC_CHANGE_CATEGORIES)[number];

export const MOC_SIFAT_PERUBAHAN = ["Permanen", "Sementara", "Darurat"] as const;
export type MocSifatPerubahan = (typeof MOC_SIFAT_PERUBAHAN)[number];

// Jenis Dampak Risiko (PEARL) pada formulir.
export const MOC_RISK_IMPACTS = ["People", "Environment", "Asset", "Reputation", "Legal"] as const;
export type MocRiskImpact = (typeof MOC_RISK_IMPACTS)[number];

// 5 tingkat (bukan cuma L/M/H) — ambang nilai→tingkat ditemukan 2026-09-30 dari
// rumus IFS tersembunyi di sel "Tingkat Risiko" Form MoC 2025.xlsx (sebelumnya
// dicatat sebagai pertanyaan terbuka: "batas nilai→tingkat belum ditetapkan di
// TKO" — ternyata ada, cuma di rumus formulir, bukan di teks TKO).
export const MOC_RISK_LEVELS = ["L", "LTM", "M", "MTH", "H"] as const;
export type MocRiskLevel = (typeof MOC_RISK_LEVELS)[number];
export const MOC_RISK_LEVEL_LABEL: Record<MocRiskLevel, string> = {
  L: "Rendah",
  LTM: "Rendah-Menengah",
  M: "Menengah",
  MTH: "Menengah-Tinggi",
  H: "Tinggi",
};
// Warna persis dari format bersyarat sel "Tingkat Risiko" di Form MoC 2025.xlsx.
export const MOC_RISK_LEVEL_COLOR: Record<MocRiskLevel, string> = {
  L: "#00B050",
  LTM: "#92D050",
  M: "#FFFF00",
  MTH: "#FFC000",
  H: "#FF0000",
};

// Matriks risiko kiriman client (WhatsApp 13 Okt 2026): Risiko = Likelihood x Severity, masing-masing 1-5.
// Label, rentang, dan frekuensi disalin persis dari gambar matriks.
export const MOC_SEVERITY_LEVELS: { value: number; label: string }[] = [
  { value: 1, label: "Insignificant" },
  { value: 2, label: "Minor" },
  { value: 3, label: "Moderate" },
  { value: 4, label: "Significant" },
  { value: 5, label: "Catastrophic" },
];
export const MOC_LIKELIHOOD_LEVELS: { value: number; label: string; range: string; frequency: string }[] = [
  { value: 1, label: "Rare", range: "0% < X < 20%", frequency: "<10⁻⁶ per year" },
  { value: 2, label: "Unlikely", range: "20% < X < 40%", frequency: "10⁻⁶ to 10⁻⁴ per year" },
  { value: 3, label: "Moderate", range: "40% < X < 60%", frequency: "10⁻⁴ to 10⁻² per year" },
  { value: 4, label: "Likely", range: "60% < X < 80%", frequency: "10⁻² to 1 per year" },
  { value: 5, label: "Almost", range: "80% < X < 100%", frequency: "> 1 per year" },
];

// Tabel 3 TKO B13.3-07 "Kewenangan Validasi MoC" (kolom Lokasi dan Region/AP; kolom Subholding di luar cakupan
// aplikasi). Dipakai sebagai info saat memilih Reviewer/Approver; pemilihan tetap manual oleh Initiator.
export const MOC_AUTHORITY_TABLE: { role: string; scope: string; lokasi: string; region: string }[] = [
  { role: "Change Initiator", scope: "Semua", lokasi: "Pekerja Pertamina", region: "Pekerja Pertamina" },
  { role: "MoC Reviewer", scope: "1 – 12", lokasi: "Maintenance Service, HSSE / AP", region: "DRE, HSSE Regional / AP" },
  { role: "MoC Reviewer", scope: "13", lokasi: "Fungsi IT, Maintenance Service, HSSE", region: "Fungsi IT, DRE, HSSE Regional / AP" },
  { role: "MoC Approver", scope: "Semua", lokasi: "Terminal Manager (IT / FT / AFT) / Operation Head", region: "Manager Fungsi Regional / AP, EGM / GHO / SMOM" },
  { role: "MoC Controller", scope: "Semua", lokasi: "HSSE Lokasi", region: "HSSE Regional" },
];

// Status pada Register MOC (Lampiran 8, keterangan status perubahan 1-5).
export const MOC_REGISTER_STATUSES = [
  "Inisiasi & Validasi",
  "Implementasi",
  "Pemantauan",
  "Tinjauan Akhir",
  "Closed",
] as const;
export type MocRegisterStatus = (typeof MOC_REGISTER_STATUSES)[number];

// Sub-status di dalam "Inisiasi & Validasi" (Tahap A-C).
export const MOC_VALIDATION_STATES = [
  "draft",
  "in_review",
  "returned",
  "pending_approval",
  "rejected",
  "approved",
  "registered",
  // Gelombang B (catatan client 20 Okt 2026): pengajuan penundaan/penghentian saat Pemantauan.
  "halt_requested",
  "halted",
] as const;
export type MocValidationState = (typeof MOC_VALIDATION_STATES)[number];

export const MOC_VALIDATION_STATE_LABEL: Record<MocValidationState, string> = {
  draft: "Draf Initiator",
  in_review: "Menunggu review",
  returned: "Dikembalikan ke Initiator",
  pending_approval: "Menunggu persetujuan",
  rejected: "Ditolak Approver",
  approved: "Disetujui, menunggu registrasi",
  registered: "Terdaftar",
  halt_requested: "Menunggu keputusan penundaan/penghentian",
  halted: "Ditunda / dihentikan",
};

export const MOC_REVIEW_OUTCOMES = ["Pending", "Sesuai", "Perlu Perubahan"] as const;
export type MocReviewOutcome = (typeof MOC_REVIEW_OUTCOMES)[number];

export const MOC_HISTORY_ACTIONS = [
  "Draf Dibuat",
  "Diajukan",
  "Review Sesuai",
  "Review Perlu Perubahan",
  "Diperbarui Initiator",
  "Disetujui",
  "Ditolak",
  "Diregistrasi",
  "Komunikasi Dicatat",
  "Rencana Implementasi Dicatat",
  "Tahap Dimajukan",
  "Pemantauan Dicatat",
  "Tinjauan Akhir Dicatat",
  "Ditutup",
  "PSI Terdampak Diubah",
  "Form Pemantauan Ditandatangani",
  "Penundaan/Penghentian Diajukan",
  "Penundaan/Penghentian Diputuskan",
  "Dilanjutkan Kembali",
  "Review Tinjauan Akhir",
  "Penutupan Disetujui",
] as const;
export type MocHistoryAction = (typeof MOC_HISTORY_ACTIONS)[number];

// Peran MOC yang melekat pada akun (selain Initiator/Controller yang berasal dari `role`).
export const MOC_ROLE_FLAGS = ["Reviewer", "Approver", "Performer"] as const;
export type MocRoleFlag = (typeof MOC_ROLE_FLAGS)[number];

export interface MocPlannedReviewer {
  userId: string; // "" = baris belum dipilih (atau manual)
  functionLabel: string;
  jabatan: string;
  // Reviewer tanpa akun (manual): nama diketik, review dicatat Initiator/Controller atas namanya.
  // Reviewer dari akun peran: `name` = nama orang yang menjabat (opsional), ditampilkan di formulir.
  manual?: boolean;
  name?: string;
}

// Saran fungsi/jabatan per peran MOC di tingkat Lokasi (TKO B13.3-07 Tabel 3): Reviewer =
// Maintenance Service & HSSE (+ Fungsi IT untuk scope 13), Approver = Terminal Manager /
// Operation Head. Performer ditunjuk Approver (tidak terikat fungsi tertentu).
export const MOC_FUNCTION_SUGGESTIONS: Record<MocRoleFlag, readonly string[]> = {
  Reviewer: ["Maintenance Service", "HSSE", "Fungsi IT"],
  Approver: ["Terminal Manager", "Operation Head"],
  Performer: [],
};
// Reviewer/Approver wajib punya fungsi/jabatan (dipakai di dropdown & lembar cetak).
export const MOC_ROLES_NEED_FUNCTION: readonly MocRoleFlag[] = ["Reviewer", "Approver"];

// Tingkat Region/AP (TKO B13.3-07 Tabel 3, kolom "Region / AP"): Reviewer = DRE dan HSSE Regional/AP (+ Fungsi IT untuk
// scope 13), Approver = Manager Fungsi Regional/AP atau EGM/GHO/SMOM, Controller = HSSE Regional. Performer ditunjuk
// Approver. Dipakai untuk akun yang terikat ke unit Regional Jatimbalinus (lihat regionalUnit.ts).
export const MOC_FUNCTION_SUGGESTIONS_REGIONAL: Record<MocRoleFlag, readonly string[]> = {
  Reviewer: ["DRE", "HSSE Regional", "Fungsi IT"],
  Approver: ["Manager Fungsi Regional", "EGM/GHO/SMOM"],
  Performer: [],
};

export function mocFunctionSuggestions(role: MocRoleFlag, location?: string | null): readonly string[] {
  return (isRegionalUnit(location) ? MOC_FUNCTION_SUGGESTIONS_REGIONAL : MOC_FUNCTION_SUGGESTIONS)[role];
}

export function hasMocRole(user: { mocRoles?: string[] | null }, flag: MocRoleFlag): boolean {
  return !!user.mocRoles && user.mocRoles.includes(flag);
}

// "lampiran" = gambar/PDF pendukung tahap Implementasi dst. (bukan bukti tanda tangan).
export const MOC_EVIDENCE_SLOTS = ["initiator", "reviewer", "approver", "controller", "lampiran"] as const;
export type MocEvidenceSlot = (typeof MOC_EVIDENCE_SLOTS)[number];

// SLA (TKO Tabel 5): review 5/10/15 hari kerja menurut tingkat risiko L/M/H;
// persetujuan 5 hari. TKO Tabel 5 cuma punya 3 tingkat — tidak menyebut LTM/MTH
// (baru ditemukan 2026-09-30 dari rumus formulir, lihat MOC_RISK_LEVELS). ASUMSI
// belum dikonfirmasi: LTM dan MTH dibulatkan ke SLA yang lebih ketat/lebih lama
// (LTM→SLA M, MTH→SLA H) — lebih aman daripada dibulatkan turun, tapi TKO tidak
// menyebutkan ini secara eksplisit; tanyakan user kalau perlu presisi.
export const MOC_REVIEW_SLA_DAYS: Record<MocRiskLevel, number> = { L: 5, LTM: 10, M: 10, MTH: 15, H: 15 };
export const MOC_APPROVAL_SLA_DAYS = 5;

// Tanda tangan dilakukan di luar web (keputusan user 2026-09-25): web hanya
// menyimpan berkas bukti yang diunggah balik. Belum ditentukan apakah bukti wajib
// per aksi — sementara opsional; ubah ke true untuk mewajibkannya di semua aksi.
export const MOC_REQUIRE_SIGNED_EVIDENCE = false;

export interface MocBarrier {
  text: string;
  pic: string; // kolom PENANGGUNG JAWAB di samping tiap barrier pada formulir
}

// ---------------------------------------------------------------------------------------------------------------
// Tahap F Pemantauan, G Tinjauan Akhir, H Penutupan (Formulir Lampiran 6 dan 7, TKO B13.3-07; jawaban client
// 13 Okt 2026): pemantauan minimal 1x per 3 bulan, hasilnya lanjut / perpanjang / tutup; perpanjangan maksimal
// 2 x 6 bulan; Tinjauan Akhir paling lambat 3 bulan (Permanen) atau 1 bulan (Sementara dan Darurat); penutupan oleh
// MoC Approver.
export const MOC_MONITOR_OUTCOMES = ["Lanjut", "Perpanjang", "Tutup"] as const;
export type MocMonitorOutcome = (typeof MOC_MONITOR_OUTCOMES)[number];
export const MOC_MONITOR_OUTCOME_LABEL: Record<MocMonitorOutcome, string> = {
  Lanjut: "Lanjutkan pemantauan",
  Perpanjang: "Perpanjang pemantauan 6 bulan",
  Tutup: "Tutup pemantauan, lanjut ke Tinjauan Akhir",
};
export const MOC_MONITOR_INTERVAL_MONTHS = 3;
export const MOC_EXTENSION_MONTHS = 6;
export const MOC_MAX_EXTENSIONS = 2;
// Batas Tinjauan Akhir sejak masuk tahap itu (bulan). Darurat: 1 bulan, atau 3 bulan bila ditetapkan menjadi tetap.
export const MOC_FINAL_REVIEW_MONTHS: Record<MocSifatPerubahan, number> = { Permanen: 3, Sementara: 1, Darurat: 1 };
// Pertanyaan pada Formulir Lampiran 7 (urutan dan kata-kata persis formulir).
export const MOC_FINAL_QUESTIONS = [
  "Apakah tujuan dan sasaran perubahan tercapai ?",
  "Apakah mitigasi risiko dari perubahan telah dilaksanakan?",
  "Apakah informasi keselamatan proses akibat perubahan telah disosialisasikan kepada pekerja terkait?",
  "Apakah rencana tanggap darurat telah disesuaikan untuk mengakomodir perubahan?",
] as const;

// Satu baris tabel pada Lampiran 6 dan 7: Kegiatan (atau Deskripsi Aksi Tindak Lanjut), Keterangan, Tahapan, PIC,
// Target Date, Status.
export interface MocTrackedItem {
  item: string;
  keterangan: string;
  tahapan: string;
  pic: string;
  targetDate: string; // YYYY-MM-DD atau ""
  status: string;
}
export interface MocMonitoringInput {
  date: string; // YYYY-MM-DD
  activities: MocTrackedItem[];
  followUps: MocTrackedItem[];
  notes: string;
  outcome: MocMonitorOutcome;
}
export type MocMonitoringEntry = MocMonitoringInput & MocRecordedBy & { no: number };
export interface MocFinalReviewerRow {
  fungsi: string;
  keterangan: string;
  tanggapan: string;
  tanggal: string;
}
export interface MocFinalReviewInput {
  date: string;
  answers: { yes: boolean | null; keterangan: string }[]; // sejajar dengan MOC_FINAL_QUESTIONS
  followUps: MocTrackedItem[];
  reviewers: MocFinalReviewerRow[]; // MoC Reviewer & Tim Peninjau Akhir
  notes: string;
}
// Tanggapan Reviewer atas Tinjauan Akhir (satu per Reviewer pada putaran review terakhir).
export interface MocFinalResponse {
  userId: string | null; // null = Reviewer tanpa akun (dicatat Initiator/Controller atas namanya)
  name: string;
  fungsi: string;
  jabatan: string;
  outcome: MocReviewOutcome;
  note: string;
  at?: string; // ISO
  byName?: string; // pencatat bila atas nama
}
export type MocFinalReview = MocFinalReviewInput & MocRecordedBy & { responses?: MocFinalResponse[] };
export type MocHaltKind = "Tunda" | "Hentikan";
// Pengajuan penundaan/penghentian MOC saat Pemantauan ke Approver. Bila disetujui MOC "halted"; melanjutkan lagi
// berarti mengulang Penilaian Risiko dan Validasi.
export interface MocHalt {
  kind: MocHaltKind;
  reason: string;
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  decision: "Disetujui" | "Ditolak" | null;
  decisionNote: string;
  decidedByName: string | null;
  decidedAt: string | null;
  onBehalfOf: string | null;
}
export interface MocClosure {
  note: string;
  closedAt: string; // ISO
  closedById: string;
  closedByName: string;
  onBehalfOf: string | null; // nama Approver tanpa akun bila Controller yang mencatat
  // Penutupan = persetujuan Approver (closedAt) lalu FINALISASI Controller dengan form penutupan bertanda tangan.
  finalizedAt?: string;
  finalizedByName?: string;
}

// PSI terdampak (Tahap 4): dokumen Direktori yang berubah akibat MOC. `updated` = sudah ada revisi nyata sesudah ditandai.
export interface MocAffectedDoc {
  documentId: string;
  documentNumber: string;
  title: string;
  baselineVersion: string;
  currentVersion: string;
  addedByName: string;
  addedAt: string;
  updated: boolean;
}
export interface MocAffectedByDoc {
  mocId: string;
  mocNumber: string | null;
  judul: string;
  registerStatus: string;
  validationState: string;
  baselineVersion: string;
  addedAt: string;
  updated: boolean;
}
// Siapa yang boleh menandai/melepas PSI terdampak: pembuat MOC atau Controller lokasi MOC, selama belum Closed.
export function mocCanEditAffected(moc: Pick<MocRequest, "location" | "createdBy" | "registerStatus">, user: MocActor): boolean {
  if (!user.location || user.location !== moc.location || moc.registerStatus === "Closed") return false;
  return user.role.includes("Controller") || moc.createdBy === user.id;
}
// Dokumen terdampak yang belum diperbarui (dipakai peringatan saat penutupan).
export const mocAffectedPending = (docs: Pick<MocAffectedDoc, "updated">[]) => docs.filter((d) => !d.updated).length;

// Tahap D Komunikasi (TKO V-D.1.a): isi rencana komunikasi & pelatihan, urutan sesuai TKO.
export const MOC_COMMUNICATION_ITEMS = [
  "Tujuan dan sasaran MoC",
  "Dokumen informasi keselamatan (hasil penilaian risiko)",
  "Rekaman / catatan",
  "Prosedur",
  "Gambar-gambar",
  "Aplikasi penyimpanan & pemutakhiran untuk pekerja/kontraktor",
] as const;
export type MocCommunicationItem = (typeof MOC_COMMUNICATION_ITEMS)[number];

// Media komunikasi (TKO III.2.d).
export const MOC_COMMUNICATION_MEDIA = ["Email", "Forum / rapat rutin", "Presentasi / video induksi", "Lainnya"] as const;
export type MocCommunicationMedium = (typeof MOC_COMMUNICATION_MEDIA)[number];

// Isian yang diketik user; siapa/kapan dicatat server.
export interface MocCommunicationInput {
  items: MocCommunicationItem[];
  media: MocCommunicationMedium[];
  mediaOther: string;
  date: string; // YYYY-MM-DD
  audience: string; // pekerja / kontraktor yang diberi tahu
  notes: string;
}
export interface MocRecordedBy {
  recordedById: string;
  recordedByName: string;
  recordedAt: string; // ISO
}
export type MocCommunication = MocCommunicationInput & MocRecordedBy;

export interface MocMilestone {
  label: string;
  targetDate: string; // YYYY-MM-DD
}
// Tahap E langkah 1 (TKO V-E.1.b): rencana implementasi yang diserahkan ke Performer.
export interface MocImplementationPlanInput {
  technicalPlan: string;
  monitoringPlan: string;
  milestones: MocMilestone[];
  documentationPlan: string;
}
export type MocImplementationPlan = MocImplementationPlanInput & MocRecordedBy;

export interface MocReview {
  id: string;
  round: number;
  functionLabel: string; // mis. "Maintenance Service", "HSSE"
  reviewerUserId: string | null;
  reviewerName: string;
  reviewerJabatan: string;
  // Username akun yang diminta mereview (supaya jelas harus login dengan akun mana).
  reviewerUsername?: string | null;
  outcome: MocReviewOutcome;
  recommendation: string;
  reviewedAt?: string;
}

export interface MocHistoryEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  action: MocHistoryAction;
  notes?: string;
  fromState?: string;
  toState?: string;
}

export interface MocEvidence {
  id: string;
  slot: MocEvidenceSlot;
  stage?: string;
  reviewId?: string;
  fileId: string;
  fileName?: string;
  fileUrl: string;
  uploadedByName: string;
  uploadedAt: string;
}

// Isi Formulir Lampiran 5 (Tahap Inisiasi + Penilaian Risiko).
export interface MocFormContent {
  unitOperasi: string;
  fungsi: string;
  region: string;
  anggaranType: string;
  tanggal: string;
  judul: string;
  latarBelakang: string;
  changeCategories: MocChangeCategory[];
  sifatPerubahan: MocSifatPerubahan;
  validFrom?: string;
  validUntil?: string;
  deskripsi: string;
  prosesTerdampak: string;
  peraturanRelevan: string;
  stakeholderReviewer: string;
  studiKajian: string;
  usulanPerformer: string;
  initiatorName: string;
  initiatorJabatan: string;
  riskImpacts: MocRiskImpact[];
  hazardDescription: string;
  severity: number | null;
  probability: number | null;
  riskLevel: MocRiskLevel | null;
  plantBarriers: MocBarrier[];
  processBarriers: MocBarrier[];
  peopleBarriers: MocBarrier[];
  upsideGain: string;
  downsideLoss: string;
}

export interface MocRequest extends MocFormContent {
  id: string;
  mocNumber: string | null; // diisi Controller saat registrasi
  location: string;
  createdBy: string | null;
  createdByName: string | null;
  // Kapan MOC masuk ke keadaan sekarang (ISO). Dasar hitungan "melewati batas waktu".
  stateSince: string | null;
  registerStatus: MocRegisterStatus;
  validationState: MocValidationState;
  round: number;
  approverUserId: string | null;
  approverName: string | null;
  performerUserId: string | null;
  performerName: string | null;
  approverNote: string | null;
  plannedReviewers: MocPlannedReviewer[];
  plannedApproverId: string | null;
  // Approver tanpa akun (diketik manual); approverUserId kosong. Keputusannya dicatat Controller atas namanya.
  approverManualName: string | null;
  approverManualJabatan: string | null;
  // Jabatan Approver untuk lembar cetak: ketikan manual, atau fungsi pada akun Approver (diisi server saat memuat detail).
  approverJabatan?: string | null;
  // null = belum dicatat. Diisi setelah registrasi, sebelum Implementasi dimulai.
  communication: MocCommunication | null;
  implementationPlan: MocImplementationPlan | null;
  // Tahap F-H: catatan pemantauan berurutan (ke-1, ke-2, ...), tinjauan akhir, dan penutupan.
  monitoring: MocMonitoringEntry[];
  finalReview: MocFinalReview | null;
  halt: MocHalt | null;
  closure: MocClosure | null;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  reviews: MocReview[];
  history: MocHistoryEntry[];
  evidence: MocEvidence[];
}

export interface MocActor {
  id: string;
  name: string;
  role: string;
  location: string | null;
  isRegionalAdmin?: boolean;
}

export type MocAction =
  | "edit"
  | "submit"
  | "review"
  | "reviewProxy"
  | "decide"
  | "decideProxy"
  | "editParties"
  | "register"
  | "communicate"
  | "planImplementation"
  | "advance"
  | "monitor"
  | "finalReview"
  | "close"
  | "closeProxy"
  | "signMonitoring"
  | "requestHalt"
  | "decideHalt"
  | "decideHaltProxy"
  | "resume"
  | "reviewFinal"
  | "reviewFinalProxy"
  | "finalizeClosure";

export const MOC_INITIATOR_ROLE = "Penanggung Jawab PSI (Initiator)";

export function riskValue(severity: number | null, probability: number | null): number | null {
  if (!severity || !probability) return null;
  return severity * probability;
}

// Sesuai rumus sel N34 Form MoC 2025.xlsx persis:
// =IFS(J34<=3,"L", J34=4,"LTM", J34<=9,"M", J34<=12,"MTH", J34>=13,"H")
// Dipakai untuk menurunkan Tingkat Risiko otomatis dari Nilai Risiko — bukan lagi
// dipilih manual oleh Initiator (lihat catatan di MOC_RISK_LEVELS).
export function riskLevel(value: number | null): MocRiskLevel | null {
  if (value === null) return null;
  if (value <= 3) return "L";
  if (value === 4) return "LTM";
  if (value <= 9) return "M";
  if (value <= 12) return "MTH";
  return "H";
}

export function reviewsOfCurrentRound(moc: Pick<MocRequest, "reviews" | "round">): MocReview[] {
  return moc.reviews.filter((r) => r.round === moc.round);
}

// Review paralel: semua reviewer pada putaran berjalan menilai tanpa saling menunggu.
// 'waiting' = masih ada yang Pending; 'needs_changes' = semua sudah menilai dan
// minimal satu Perlu Perubahan; 'all_ok' = semua Sesuai.
export function resolveReviewRound(reviews: Pick<MocReview, "outcome">[]): "waiting" | "needs_changes" | "all_ok" {
  if (reviews.length === 0) return "waiting";
  if (reviews.some((r) => r.outcome === "Pending")) return "waiting";
  return reviews.some((r) => r.outcome === "Perlu Perubahan") ? "needs_changes" : "all_ok";
}

// Hak TULIS MOC hanya untuk user di lokasi MOC itu sendiri. Admin Regional
// SENGAJA tidak dapat bertindak atas MOC lokasi (hanya melihat) — keputusan meeting
// (regional boleh melihat tahap MOC tiap lokasi, tidak approve/validasi).
function isLocationMember(moc: Pick<MocRequest, "location">, user: MocActor): boolean {
  return !!user.location && user.location === moc.location;
}

// Aksi apa saja yang boleh dilakukan user ini pada MOC ini sekarang. Klien memakainya
// untuk menampilkan tombol; API route WAJIB memanggilnya lagi sebelum mengubah data.
export function mocActionsFor(moc: MocRequest, user: MocActor): MocAction[] {
  if (!isLocationMember(moc, user)) return [];
  const actions: MocAction[] = [];
  const isController = user.role.includes("Controller");

  // Hanya PEMBUAT MOC (akun Initiator yang membuatnya) yang boleh mengubah/mengajukan.
  // Sebelumnya semua akun ber-role Initiator di lokasi itu bisa — akibatnya reviewer/
  // approver (yang juga ber-role Initiator) melihat draf orang lain sebagai "perlu diajukan".
  const initiatorMayEdit =
    user.role === MOC_INITIATOR_ROLE &&
    moc.createdBy === user.id &&
    (moc.validationState === "draft" || moc.validationState === "returned" || moc.validationState === "rejected");
  if (initiatorMayEdit) actions.push("edit", "submit");

  if (moc.validationState === "in_review") {
    const mine = reviewsOfCurrentRound(moc).some((r) => r.reviewerUserId === user.id && r.outcome === "Pending");
    if (mine) actions.push("review");
  }
  if (moc.validationState === "pending_approval" && moc.approverUserId === user.id) actions.push("decide");

  // Pihak tanpa akun (diketik manual): review dicatat pembuat MOC atau Controller atas nama reviewer; keputusan
  // Approver hanya dicatat Controller (Initiator tidak boleh memutuskan MOC-nya sendiri). Controller juga
  // boleh memperbaiki nama pihak tanpa akun selama review/persetujuan berjalan.
  const isOwner = user.role === MOC_INITIATOR_ROLE && moc.createdBy === user.id;
  const manualReviewPending = moc.validationState === "in_review" && reviewsOfCurrentRound(moc).some((r) => !r.reviewerUserId && r.outcome === "Pending");
  const manualApproverPending = moc.validationState === "pending_approval" && !moc.approverUserId && !!moc.approverManualName;
  if (manualReviewPending && (isOwner || isController)) actions.push("reviewProxy");
  if (manualApproverPending && isController) actions.push("decideProxy");
  if ((manualReviewPending || manualApproverPending) && isController) actions.push("editParties");
  if (moc.validationState === "approved" && isController) actions.push("register");

  // Setelah registrasi, sebelum Implementasi: Komunikasi (D) lalu Rencana Implementasi (E.1), diisi
  // pembuat MOC atau Controller lokasi (atas nama Initiator). Initiator juga yang menyerahkan ke
  // Performer (TKO E.1.c), jadi ia boleh memulai Implementasi; tahap sesudahnya tetap Controller.
  if (moc.validationState === "registered" && moc.registerStatus === "Inisiasi & Validasi") {
    // Catatan client 20 Okt 2026: Komunikasi, Rencana Implementasi, dan serah ke Performer dikerjakan INITIATOR
    // pembuat MOC (bukan Controller); setelah Controller meregistrasi, MOC kembali ke Initiator.
    const isOwner = user.role === MOC_INITIATOR_ROLE && moc.createdBy === user.id;
    if (isOwner) {
      actions.push("communicate");
      if (moc.communication) actions.push("planImplementation");
      actions.push("advance");
    }
  } else if (moc.validationState === "registered" && moc.registerStatus === "Implementasi") {
    const isOwner = user.role === MOC_INITIATOR_ROLE && moc.createdBy === user.id;
    if (isOwner) actions.push("advance"); // Implementasi -> Pemantauan oleh Initiator
  }

  const owner = user.role === MOC_INITIATOR_ROLE && moc.createdBy === user.id;
  const isApproverAccount = !!moc.approverUserId && moc.approverUserId === user.id;
  const approverManual = !moc.approverUserId && !!moc.approverManualName;

  // Penundaan/penghentian: Approver memutuskan; bila ditunda/dihentikan Initiator dapat mengulang dari Penilaian Risiko.
  if (moc.validationState === "halt_requested") {
    if (isApproverAccount) actions.push("decideHalt");
    else if (approverManual && isController) actions.push("decideHaltProxy");
  }
  if (moc.validationState === "halted" && owner) actions.push("resume");

  if (moc.validationState === "registered") {
    if (moc.registerStatus === "Pemantauan") {
      // Form Pemantauan diisi Initiator lalu diserahkan ke Controller, yang WAJIB mengunggah form bertanda tangan sebelum lanjut.
      const unsigned = mocUnsignedMonitoring(moc);
      if (owner && !unsigned) actions.push("monitor", "requestHalt");
      if (isController && unsigned) actions.push("signMonitoring");
    }
    if (moc.registerStatus === "Tinjauan Akhir") {
      const fr = moc.finalReview;
      const responses = fr?.responses ?? [];
      const needsRevision = responses.some((r) => r.outcome === "Perlu Perubahan");
      // Initiator mengisi Tinjauan Akhir (lagi bila Reviewer meminta perubahan).
      if (owner && !moc.closure && (!fr || needsRevision)) actions.push("finalReview");
      if (fr && !moc.closure && !needsRevision) {
        if (responses.some((r) => r.outcome === "Pending" && r.userId && r.userId === user.id)) actions.push("reviewFinal");
        if (responses.some((r) => r.outcome === "Pending" && !r.userId) && (owner || isController)) actions.push("reviewFinalProxy");
        // Setelah semua Reviewer Sesuai: Approver menyetujui penutupan (data lama tanpa tanggapan dianggap sudah sesuai).
        if (responses.every((r) => r.outcome === "Sesuai")) {
          if (isApproverAccount) actions.push("close");
          else if (approverManual && isController) actions.push("closeProxy");
        }
      }
      // Controller memfinalisasi penutupan dengan mengunggah form penutupan bertanda tangan.
      if (moc.closure && isController) actions.push("finalizeClosure");
    }
  }
  return actions;
}

// Bukti Form Pemantauan bertanda tangan disimpan sebagai evidence dengan stage "Pemantauan-<no>".
export const monitoringEvidenceStage = (no: number) => `Pemantauan-${no}`;
export const CLOSURE_EVIDENCE_STAGE = "Penutupan";
// Form Pengusulan & Validasi (Lampiran 5) bertanda tangan lengkap, diunggah Controller saat Registrasi (wajib).
export const PENGUSULAN_EVIDENCE_STAGE = "Pengusulan";
export function mocIsMonitoringSigned(moc: Pick<MocRequest, "evidence">, no: number): boolean {
  return moc.evidence.some((e) => e.stage === monitoringEvidenceStage(no));
}
// Pemantauan terakhir yang formnya belum diunggah bertanda tangan (null = semua sudah, atau belum ada pemantauan).
export function mocUnsignedMonitoring(moc: Pick<MocRequest, "monitoring" | "evidence">): MocMonitoringEntry | null {
  const last = moc.monitoring[moc.monitoring.length - 1];
  return last && !mocIsMonitoringSigned(moc, last.no) ? last : null;
}

// ---------------------------------------------------------------------------------------------------------------
// Jadwal pemantauan dan tinjauan akhir. Tanggal dihitung dalam WIB. `stateSince` (kapan MOC masuk tahap sekarang)
// dipakai sebagai tanggal dasar bila belum ada catatan pemantauan.
export function wibYmd(input: string | number | Date): string {
  const d = input instanceof Date ? input : new Date(input);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
export function addMonthsYmd(ymd: string, months: number): string {
  // Jepit ke akhir bulan tujuan (31 Des + 6 bulan = 30 Jun), bukan meluap ke bulan berikutnya.
  const [y, m, day] = ymd.split("-").map(Number);
  const target = new Date(y, m - 1 + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`;
}
const daysBetweenYmd = (fromYmd: string, toYmd: string) => Math.round((new Date(`${toYmd}T00:00:00`).getTime() - new Date(`${fromYmd}T00:00:00`).getTime()) / 86_400_000);

export function mocExtensionsUsed(moc: Pick<MocRequest, "monitoring">): number {
  return moc.monitoring.filter((e) => e.outcome === "Perpanjang").length;
}

// Batas pemantauan berikutnya (YYYY-MM-DD): 3 bulan sesudah pemantauan terakhir, atau sejak masuk tahap Pemantauan.
export function mocMonitoringDue(moc: Pick<MocRequest, "validationState" | "registerStatus" | "monitoring" | "stateSince">): string | null {
  if (moc.validationState !== "registered" || moc.registerStatus !== "Pemantauan") return null;
  const base = moc.monitoring.length > 0 ? moc.monitoring[moc.monitoring.length - 1].date : moc.stateSince ? wibYmd(moc.stateSince) : "";
  return base ? addMonthsYmd(base, MOC_MONITOR_INTERVAL_MONTHS) : null;
}
export function mocMonitoringOverdueDays(moc: Parameters<typeof mocMonitoringDue>[0], nowMs: number = Date.now()): number {
  const due = mocMonitoringDue(moc);
  return due ? Math.max(0, daysBetweenYmd(due, wibYmd(nowMs))) : 0;
}
// Batas Tinjauan Akhir menurut sifat perubahan.
export function mocFinalReviewDue(moc: Pick<MocRequest, "validationState" | "registerStatus" | "sifatPerubahan" | "stateSince">): string | null {
  if (moc.validationState !== "registered" || moc.registerStatus !== "Tinjauan Akhir" || !moc.stateSince) return null;
  return addMonthsYmd(wibYmd(moc.stateSince), MOC_FINAL_REVIEW_MONTHS[moc.sifatPerubahan]);
}
export function mocFinalReviewOverdueDays(moc: Parameters<typeof mocFinalReviewDue>[0] & Pick<MocRequest, "finalReview">, nowMs: number = Date.now()): number {
  if (moc.finalReview) return 0;
  const due = mocFinalReviewDue(moc);
  return due ? Math.max(0, daysBetweenYmd(due, wibYmd(nowMs))) : 0;
}

// Kelengkapan isian (pesan sama di klien dan server).
export function mocMonitoringIssues(i: MocMonitoringInput, extUsed: number, todayYmd: string): string[] {
  const issues: string[] = [];
  if (!i.date) issues.push("Tanggal pemantauan wajib diisi.");
  else if (i.date > todayYmd) issues.push("Tanggal pemantauan tidak boleh di masa depan.");
  if (!i.activities.some((a) => a.item.trim())) issues.push("Isi minimal satu aktivitas yang dipantau.");
  if (i.outcome === "Perpanjang" && extUsed >= MOC_MAX_EXTENSIONS) {
    issues.push(`Perpanjangan sudah ${MOC_MAX_EXTENSIONS} kali ${MOC_EXTENSION_MONTHS} bulan; risiko harus direview ulang sebelum diperpanjang lagi.`);
  }
  return issues;
}
export function mocFinalReviewIssues(i: MocFinalReviewInput, todayYmd: string): string[] {
  const issues: string[] = [];
  if (!i.date) issues.push("Tanggal tinjauan akhir wajib diisi.");
  else if (i.date > todayYmd) issues.push("Tanggal tinjauan akhir tidak boleh di masa depan.");
  if (i.answers.length !== MOC_FINAL_QUESTIONS.length || i.answers.some((a) => a.yes === null)) issues.push("Jawab keempat pertanyaan tinjauan akhir dengan Ya atau Tidak.");
  else if (i.answers.some((a) => a.yes === false && !a.keterangan.trim())) issues.push("Beri keterangan untuk setiap jawaban Tidak.");
  return issues;
}

// Isian minimum catatan Komunikasi. Mengembalikan daftar masalah (kosong = lengkap).
// Bukti komunikasi (notulen / daftar hadir / dokumentasi) WAJIB (catatan client 20 Okt 2026): `hasEvidence` = ada berkas
// yang dilampirkan sekarang atau sebelumnya pada tahap Komunikasi.
export function mocCommunicationIssues(c: MocCommunicationInput, hasEvidence = true): string[] {
  const issues: string[] = [];
  if (!hasEvidence) issues.push("Lampirkan bukti komunikasi (notulen / daftar hadir / dokumentasi).");
  if (c.items.length === 0) issues.push("Pilih minimal satu hal yang dikomunikasikan.");
  if (c.media.length === 0) issues.push("Pilih minimal satu media komunikasi.");
  if (c.media.includes("Lainnya") && !c.mediaOther.trim()) issues.push("Sebutkan media lainnya.");
  if (!c.date) issues.push("Tanggal komunikasi wajib diisi.");
  if (!c.audience.trim()) issues.push("Sebutkan pekerja/kontraktor yang diberi tahu.");
  return issues;
}

// ASUMSI (TKO V-E.1.b menyebut 3 bagian tanpa menyatakan mana yang wajib): rencana teknis,
// rencana pemantauan, dan minimal satu milestone wajib; rencana dokumentasi opsional.
export function mocImplementationPlanIssues(p: MocImplementationPlanInput): string[] {
  const issues: string[] = [];
  if (!p.technicalPlan.trim()) issues.push("Rencana teknis pekerjaan wajib diisi.");
  if (!p.monitoringPlan.trim()) issues.push("Rencana pemantauan wajib diisi.");
  if (!p.milestones.some((m) => m.label.trim() && m.targetDate)) issues.push("Isi minimal satu milestone beserta tanggal targetnya.");
  return issues;
}

// Syarat memajukan tahap. Gerbang hanya pada langkah masuk Implementasi; MOC yang sudah
// lebih jauh (termasuk yang dimajukan manual sebelum fitur ini) tidak terdampak.
export function mocAdvanceIssues(moc: Pick<MocRequest, "registerStatus" | "communication" | "implementationPlan" | "performerName" | "evidence">): string[] {
  if (moc.registerStatus !== "Inisiasi & Validasi") return [];
  const issues: string[] = [];
  if (!moc.communication) issues.push("Komunikasi belum dicatat.");
  else if (!moc.evidence.some((e) => e.stage === "Komunikasi")) issues.push("Bukti komunikasi belum dilampirkan.");
  if (!moc.implementationPlan) issues.push("Rencana implementasi belum dicatat.");
  if (!moc.performerName) issues.push("MoC Performer belum ditunjuk.");
  return issues;
}

// Boleh menambah lampiran gambar/PDF (opsional) pada tahap Implementasi dst.: MOC sudah
// terdaftar & belum Closed, dan user adalah Controller lokasi, Performer, atau pembuat MOC.
export function mocCanAttach(moc: MocRequest, user: MocActor): boolean {
  if (!isLocationMember(moc, user)) return false;
  if (moc.validationState !== "registered" || moc.registerStatus === "Closed") return false;
  return user.role.includes("Controller") || moc.performerUserId === user.id || moc.createdBy === user.id;
}

// Delapan tahap MOC (TKO) untuk bilah progres dan dashboard. Tahap A-C diturunkan dari
// validationState; sesudahnya mengikuti status Register (Lampiran 8).
export const MOC_STAGES = ["Inisiasi & Risiko", "Review", "Persetujuan", "Registrasi & Komunikasi", "Implementasi", "Pemantauan", "Tinjauan Akhir", "Closed"] as const;
const MOC_LATER_STAGES = ["Implementasi", "Pemantauan", "Tinjauan Akhir", "Closed"] as const;

export function mocStageIndex(moc: Pick<MocRequest, "validationState" | "registerStatus">): number {
  switch (moc.validationState) {
    case "draft":
    case "returned":
    case "rejected":
      return 0;
    case "in_review":
      return 1;
    case "pending_approval":
      return 2;
    case "approved":
      return 3;
    case "halt_requested":
    case "halted":
    case "registered": {
      // Terdaftar tapi belum Implementasi = masih di tahap Registrasi & Komunikasi.
      const later = MOC_LATER_STAGES.indexOf(moc.registerStatus as (typeof MOC_LATER_STAGES)[number]);
      return later < 0 ? 3 : 4 + later;
    }
  }
}

export function nextRegisterStatus(current: MocRegisterStatus): MocRegisterStatus | null {
  const i = MOC_REGISTER_STATUSES.indexOf(current);
  return i >= 0 && i < MOC_REGISTER_STATUSES.length - 1 ? MOC_REGISTER_STATUSES[i + 1] : null;
}

// Isian minimum agar draf boleh diajukan ke reviewer. Mengembalikan daftar masalah.
// Kekurangan isian formulir: `field` = penanda bagian di formulir (id "mf-<field>") agar user bisa diarahkan ke sana.
export interface MocFormGap {
  field: string;
  message: string;
}
const blank = (v: string | null | undefined) => !(v ?? "").trim();
export function mocFormGaps(form: MocFormContent, location?: string): MocFormGap[] {
  const g: MocFormGap[] = [];
  const need = (cond: boolean, field: string, message: string) => { if (cond) g.push({ field, message }); };
  need(blank(form.unitOperasi), "unitOperasi", "Unit Operasi wajib diisi.");
  // Unit Regional: fungsi pengusul menentukan KBO pada Nomor MoC (lihat domain/kbo.ts).
  if (location && isRegionalUnit(location)) need(!REGIONAL_KBO_FUNCTIONS.some((f) => f.label === form.fungsi), "fungsi", "Pilih fungsi regional pengusul (menentukan KBO pada Nomor MoC).");
  else need(blank(form.fungsi), "fungsi", "Fungsi wajib diisi.");
  need(blank(form.region), "region", "Region wajib diisi.");
  need(blank(form.anggaranType), "anggaranType", "Jenis anggaran wajib diisi.");
  need(blank(form.tanggal), "tanggal", "Tanggal wajib diisi.");
  need(blank(form.judul), "judul", "Judul perubahan wajib diisi.");
  need(blank(form.latarBelakang), "latarBelakang", "Latar belakang / tujuan perubahan wajib diisi.");
  need(form.changeCategories.length === 0, "changeCategories", "Pilih minimal satu aktivitas / ruang lingkup perubahan.");
  if (form.sifatPerubahan === "Sementara" && (!form.validFrom || !form.validUntil)) g.push({ field: "masaBerlaku", message: "Perubahan Sementara wajib punya masa berlaku (dari-sampai)." });
  else if (form.validFrom && form.validUntil && form.validUntil < form.validFrom) g.push({ field: "masaBerlaku", message: "Tanggal akhir masa berlaku tidak boleh sebelum tanggal awal." });
  need(blank(form.deskripsi), "deskripsi", "Deskripsi perubahan wajib diisi.");
  need(blank(form.prosesTerdampak), "prosesTerdampak", "Proses, dokumen, dan pihak terdampak wajib diisi.");
  need(blank(form.peraturanRelevan), "peraturanRelevan", "Peraturan / regulasi yang relevan wajib diisi.");
  need(blank(form.stakeholderReviewer), "stakeholderReviewer", "Stakeholder / tenaga ahli (MoC Reviewer) wajib diisi.");
  need(blank(form.studiKajian), "studiKajian", "Studi kelayakan / kajian risiko wajib diisi.");
  need(blank(form.usulanPerformer), "usulanPerformer", "Usulan tim pelaksana (MoC Performer) wajib diisi.");
  need(blank(form.initiatorName), "initiatorName", "Nama Initiator wajib diisi.");
  need(blank(form.initiatorJabatan), "initiatorJabatan", "Jabatan Initiator wajib diisi.");
  need(form.riskImpacts.length === 0, "riskImpacts", "Pilih minimal satu jenis dampak risiko.");
  need(blank(form.hazardDescription), "hazardDescription", "Deskripsi bahaya wajib diisi.");
  need(!form.severity || !form.probability, "riskMatrix", "Tingkat keparahan dan probabilitas risiko wajib diisi.");
  const hasBarrier = (items: MocBarrier[]) => items.some((b) => !blank(b.text));
  need(!hasBarrier(form.plantBarriers), "plantBarriers", "Plant Barrier wajib diisi minimal satu.");
  need(!hasBarrier(form.processBarriers), "processBarriers", "Process Barrier wajib diisi minimal satu.");
  need(!hasBarrier(form.peopleBarriers), "peopleBarriers", "People Barrier wajib diisi minimal satu.");
  need(blank(form.upsideGain), "upsideGain", "Upside Gain wajib diisi.");
  need(blank(form.downsideLoss), "downsideLoss", "Downside Loss wajib diisi.");
  return g;
}
export function mocSubmitIssues(form: MocFormContent, location?: string): string[] {
  return mocFormGaps(form, location).map((x) => x.message);
}

// Penjelasan tahap sesudah registrasi. Diambil dari uraian TKO B13.3-07 (Bab III.2.e-h
// dan Prosedur E-H); alur rincinya BELUM ditetapkan sehingga ini hanya keterangan,
// bukan logika. Dipakai untuk memberi tahu user "ini sedang tahap apa dan ngapain".
export const MOC_LATER_STAGE_INFO: Record<"Implementasi" | "Pemantauan" | "Tinjauan Akhir" | "Closed", string> = {
  Implementasi:
    "MoC Performer melaksanakan perubahan sesuai rencana yang disetujui (Pre-Start-Up, JSA, pembaruan dokumen terkait, PSSR bila perlu). Initiator memastikan pelaksanaan sesuai rencana.",
  Pemantauan:
    "Initiator dan Performer memantau kesesuaian pelaksanaan; MoC Controller memantau Register MoC (minimal 1× per 3 bulan) dan memperbarui progres.",
  "Tinjauan Akhir":
    "MoC Reviewer bersama Tim Peninjau Akhir menilai efektivitas perubahan (permanen: ≤ 3 bulan setelah terimplementasi; sementara/darurat: ≤ 1 bulan setelah dikembalikan).",
  Closed: "MOC telah ditutup: Approver menyetujui penutupan dan Controller memastikan dokumen serta Register diperbarui.",
};

const fmtYmdId = (ymd: string) => new Date(`${ymd}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

// Ringkasan jelas: MOC ini SEKARANG menunggu siapa dan apa — supaya user tidak
// bingung apakah input mereka sudah masuk.
export function mocWaitingOn(moc: MocRequest): { title: string; detail: string; done: boolean } {
  const owner = moc.createdByName ? `${moc.createdByName} (pembuat MOC)` : "Pembuat MOC";
  switch (moc.validationState) {
    case "draft":
      return { title: "Draf — belum diajukan", detail: `${owner} melengkapi formulir lalu memilih Reviewer dan Approver untuk diajukan.`, done: false };
    case "returned":
      return { title: "Dikembalikan ke Initiator", detail: `Ada reviewer yang meminta perubahan. ${owner} memperbaiki lalu mengajukan ulang.`, done: false };
    case "rejected":
      return { title: "Ditolak Approver", detail: `${owner} memperbaiki sesuai catatan Approver${moc.approverNote ? ` (“${moc.approverNote}”)` : ""} lalu mengajukan ulang.`, done: false };
    case "in_review": {
      const pending = moc.reviews.filter((r) => r.round === moc.round && r.outcome === "Pending");
      const total = moc.reviews.filter((r) => r.round === moc.round).length;
      return {
        title: `Menunggu review (${total - pending.length}/${total} selesai)`,
        detail: pending.length > 0 ? `Belum menilai: ${pending.map((r) => `${r.reviewerName} (${r.functionLabel})`).join(", ")}.` : "Semua reviewer sudah menilai.",
        done: false,
      };
    }
    case "pending_approval":
      return { title: "Menunggu persetujuan Approver", detail: `${moc.approverName ?? "Approver"} memutuskan setuju atau tolak dan menunjuk MoC Performer.`, done: false };
    case "approved":
      return { title: "Disetujui — menunggu registrasi", detail: "MoC Controller mencatat MOC ke daftar MoC dan memberi Nomor MoC.", done: false };
    case "halt_requested":
      return { title: "Menunggu keputusan penundaan/penghentian", detail: `${moc.approverName ?? "MoC Approver"} memutuskan pengajuan ${moc.halt?.kind === "Hentikan" ? "penghentian" : "penundaan"} MOC.`, done: false };
    case "halted":
      return { title: moc.halt?.kind === "Hentikan" ? "MOC dihentikan" : "MOC ditunda", detail: `${owner} dapat melanjutkan kembali; MOC lalu mengulang Penilaian Risiko dan Validasi.`, done: false };
    case "registered":
      if (moc.registerStatus === "Closed") return { title: "MOC selesai (Closed)", detail: MOC_LATER_STAGE_INFO.Closed, done: true };
      if (moc.registerStatus === "Inisiasi & Validasi") {
        if (!moc.communication) {
          return { title: "Terdaftar — menunggu Komunikasi", detail: `${owner} mencatat komunikasi MOC (hasil penilaian risiko, prosedur, gambar, dst.) kepada pekerja/kontraktor terkait.`, done: false };
        }
        if (!moc.implementationPlan) {
          return { title: "Menunggu Rencana Implementasi", detail: `${owner} menyusun rencana teknis, rencana pemantauan, dan milestone untuk MoC Performer.`, done: false };
        }
        return { title: "Siap diserahkan ke Performer", detail: `${owner} atau MoC Controller menyerahkan rencana ke ${moc.performerName ?? "MoC Performer"} dan memulai Implementasi.`, done: false };
      }
      if (moc.registerStatus === "Pemantauan") {
        const unsigned = mocUnsignedMonitoring(moc);
        if (unsigned) {
          return {
            title: `Menunggu Form Pemantauan ke-${unsigned.no} bertanda tangan`,
            detail: `${owner} sudah mengisi Form Pemantauan ke-${unsigned.no}. MoC Controller mengunggah form yang sudah ditandatangani lengkap; ${unsigned.outcome === "Tutup" ? "setelah itu MOC lanjut ke Tinjauan Akhir" : "setelah itu pemantauan berikutnya dapat dicatat"}.`,
            done: false,
          };
        }
        const due = mocMonitoringDue(moc);
        const ke = moc.monitoring.length + 1;
        return {
          title: due ? `Pemantauan ke-${ke}, paling lambat ${fmtYmdId(due)}` : `Pemantauan ke-${ke}`,
          detail: `${owner} mengisi Form Pemantauan (minimal 1× per ${MOC_MONITOR_INTERVAL_MONTHS} bulan), lalu menyerahkannya ke Controller untuk diunggah bertanda tangan. Hasilnya: lanjutkan, perpanjang ${MOC_EXTENSION_MONTHS} bulan (maks ${MOC_MAX_EXTENSIONS}×), atau tutup menuju Tinjauan Akhir. Penundaan atau penghentian dapat diajukan ke Approver.`,
          done: false,
        };
      }
      if (moc.registerStatus === "Tinjauan Akhir") {
        const due = mocFinalReviewDue(moc);
        const fr = moc.finalReview;
        const resp = fr?.responses ?? [];
        if (!fr) return { title: due ? `Menunggu Tinjauan Akhir, paling lambat ${fmtYmdId(due)}` : "Menunggu Tinjauan Akhir", detail: `${owner} mengisi hasil Tinjauan Akhir (Lampiran 7).`, done: false };
        if (moc.closure) return { title: "Penutupan disetujui, menunggu form bertanda tangan", detail: "MoC Controller mengunggah Form Tinjauan Akhir & Penutupan yang sudah ditandatangani lengkap untuk menutup MOC.", done: false };
        const perlu = resp.filter((r) => r.outcome === "Perlu Perubahan");
        if (perlu.length > 0) return { title: "Tinjauan Akhir perlu diperbarui", detail: `${owner} memperbarui Tinjauan Akhir sesuai catatan Reviewer: ${perlu.map((r) => `${r.fungsi}: ${r.note}`).join("; ")}.`, done: false };
        const pending = resp.filter((r) => r.outcome === "Pending");
        if (pending.length > 0) return { title: `Menunggu review Tinjauan Akhir (${pending.length} Reviewer)`, detail: `${pending.map((r) => r.fungsi + (r.name ? ` (${r.name})` : "")).join(", ")} menanggapi Tinjauan Akhir.`, done: false };
        return { title: "Tinjauan Akhir sesuai, menunggu penutupan Approver", detail: `${moc.approverName ?? "MoC Approver"} menyetujui penutupan MOC${!moc.approverUserId ? " (dicatat Controller atas nama Approver)" : ""}.`, done: false };
      }
      return {
        title: `Tahap ${moc.registerStatus}`,
        detail: MOC_LATER_STAGE_INFO[moc.registerStatus as keyof typeof MOC_LATER_STAGE_INFO] ?? "",
        done: false,
      };
  }
}

// Peran akun ini pada MOC ini, dibaca dari data MOC (tidak menebak).
export function mocRolesOf(moc: MocRequest, actor: MocActor): string[] {
  const out: string[] = [];
  const sameLocation = !!actor.location && moc.location === actor.location;
  if (sameLocation && actor.role === MOC_INITIATOR_ROLE && moc.createdBy === actor.id) out.push("Initiator");
  const mine = moc.reviews.filter((r) => r.reviewerUserId === actor.id);
  if (mine.length > 0) out.push(`Reviewer (${mine[mine.length - 1].functionLabel})`);
  if (moc.approverUserId === actor.id) out.push("Approver");
  if (moc.performerUserId === actor.id) out.push("Performer");
  if (sameLocation && actor.role.includes("Controller")) out.push("Controller");
  return out;
}

export const MOC_ACTION_LABEL: Record<MocAction, string> = {
  edit: "Ubah",
  submit: "Ajukan",
  review: "Beri review",
  reviewProxy: "Catat review atas nama reviewer",
  decide: "Putuskan",
  decideProxy: "Catat keputusan atas nama Approver",
  editParties: "Ubah nama pihak",
  register: "Daftarkan",
  communicate: "Catat komunikasi",
  planImplementation: "Catat rencana implementasi",
  advance: "Majukan tahap",
  monitor: "Catat pemantauan",
  finalReview: "Catat tinjauan akhir",
  close: "Tutup MOC",
  closeProxy: "Setujui penutupan MOC atas nama Approver",
  signMonitoring: "Unggah Form Pemantauan bertanda tangan",
  requestHalt: "Ajukan penundaan/penghentian",
  decideHalt: "Putuskan penundaan/penghentian",
  decideHaltProxy: "Catat keputusan penundaan/penghentian atas nama Approver",
  resume: "Lanjutkan kembali MOC",
  reviewFinal: "Review Tinjauan Akhir",
  reviewFinalProxy: "Catat review Tinjauan Akhir atas nama reviewer",
  finalizeClosure: "Finalisasi penutupan MOC",
};

// Tindakan yang benar-benar "menunggu" user (tanpa 'edit' dan 'advance' yang selalu
// tersedia) — dasar lencana Navbar, notifikasi, dan kelompok "Perlu tindakan Anda".
// Komunikasi/rencana hanya "menunggu" selama belum dicatat (setelahnya tinggal ubah).
export function mocPendingActions(moc: MocRequest, actor: MocActor): MocAction[] {
  return mocActionsFor(moc, actor).filter(
    (a) =>
      a === "submit" ||
      a === "review" ||
      a === "reviewProxy" ||
      a === "decide" ||
      a === "decideProxy" ||
      a === "register" ||
      (a === "communicate" && !moc.communication) ||
      (a === "planImplementation" && !moc.implementationPlan) ||
      (a === "monitor" && mocMonitoringOverdueDays(moc) > 0) ||
      a === "finalReview" ||
      a === "close" ||
      a === "closeProxy" ||
      a === "signMonitoring" ||
      a === "decideHalt" ||
      a === "decideHaltProxy" ||
      a === "reviewFinal" ||
      a === "reviewFinalProxy" ||
      a === "finalizeClosure"
  );
}
