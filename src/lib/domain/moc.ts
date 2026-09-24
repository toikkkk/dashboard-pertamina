// Management of Change (MOC) — tipe, konstanta, dan aturan murni. Tanpa React/DOM,
// aman diimpor klien maupun API route (pola yang sama dengan rules.ts).
// Sumber: TKO B13.3-07/PNA400000/2025-S9. Fase 1 hanya mencakup Tahap A Inisiasi,
// B Penilaian Risiko, dan C Validasi; tahap D-H (Komunikasi..Penutupan) belum
// jelas alurnya dan hanya dimajukan manual lewat `advance` sampai ada kejelasan.

// 13 kotak "Aktivitas / Ruang Lingkup Perubahan" pada Formulir Lampiran 5, urutan
// sesuai formulir. (Sama dengan 13 baris Tabel 1 TKO; "Sistem/aplikasi teknologi"
// adalah Scope 13 pada Tabel 3 — menambah Fungsi IT sebagai reviewer.)
export const MOC_CHANGE_CATEGORIES = [
  "Penambahan Fasilitas Baru",
  "Akuisisi",
  "Modifikasi rekayasa / engineering",
  "Perubahan diluar rancangan",
  "Downgrade situation",
  "Penggunaan B3 baru",
  "Perubahan Instrumen / alarm",
  "Kelebihan aset",
  "Perubahan peralatan instalasi",
  "Perubahan gedung / struktur",
  "Sistem / aplikasi teknologi / metode kerja baru",
  "Perubahan sumber bahan baku / pemasok",
  "Penggantian peralatan / komponen bukan in-kind replacement",
] as const;
export type MocChangeCategory = (typeof MOC_CHANGE_CATEGORIES)[number];

export const MOC_SIFAT_PERUBAHAN = ["Permanen", "Sementara", "Darurat"] as const;
export type MocSifatPerubahan = (typeof MOC_SIFAT_PERUBAHAN)[number];

// Jenis Dampak Risiko (PEARL) pada formulir.
export const MOC_RISK_IMPACTS = ["People", "Environment", "Asset", "Reputation", "Legal"] as const;
export type MocRiskImpact = (typeof MOC_RISK_IMPACTS)[number];

export const MOC_RISK_LEVELS = ["L", "M", "H"] as const;
export type MocRiskLevel = (typeof MOC_RISK_LEVELS)[number];
export const MOC_RISK_LEVEL_LABEL: Record<MocRiskLevel, string> = { L: "Rendah", M: "Menengah", H: "Tinggi" };

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
  "Tahap Dimajukan",
] as const;
export type MocHistoryAction = (typeof MOC_HISTORY_ACTIONS)[number];

// Peran MOC yang melekat pada akun (selain Initiator/Controller yang berasal dari `role`).
export const MOC_ROLE_FLAGS = ["Reviewer", "Approver", "Performer"] as const;
export type MocRoleFlag = (typeof MOC_ROLE_FLAGS)[number];

export interface MocPlannedReviewer {
  userId: string; // "" = baris belum dipilih
  functionLabel: string;
  jabatan: string;
}

export function hasMocRole(user: { mocRoles?: string[] | null }, flag: MocRoleFlag): boolean {
  return !!user.mocRoles && user.mocRoles.includes(flag);
}

export const MOC_EVIDENCE_SLOTS = ["initiator", "reviewer", "approver", "controller"] as const;
export type MocEvidenceSlot = (typeof MOC_EVIDENCE_SLOTS)[number];

// SLA (TKO Tabel 5): review 5/10/15 hari kerja menurut tingkat risiko; persetujuan 5 hari.
export const MOC_REVIEW_SLA_DAYS: Record<MocRiskLevel, number> = { L: 5, M: 10, H: 15 };
export const MOC_APPROVAL_SLA_DAYS = 5;

// Tanda tangan dilakukan di luar web (keputusan user 2026-09-25): web hanya
// menyimpan berkas bukti yang diunggah balik. Belum ditentukan apakah bukti wajib
// per aksi — sementara opsional; ubah ke true untuk mewajibkannya di semua aksi.
export const MOC_REQUIRE_SIGNED_EVIDENCE = false;

export interface MocBarrier {
  text: string;
  pic: string; // kolom PENANGGUNG JAWAB di samping tiap barrier pada formulir
}

export interface MocReview {
  id: string;
  round: number;
  functionLabel: string; // mis. "Maintenance Service", "HSSE"
  reviewerUserId: string | null;
  reviewerName: string;
  reviewerJabatan: string;
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

export type MocAction = "edit" | "submit" | "review" | "decide" | "register" | "advance";

export const MOC_INITIATOR_ROLE = "Penanggung Jawab PSI (Initiator)";

export function riskValue(severity: number | null, probability: number | null): number | null {
  if (!severity || !probability) return null;
  return severity * probability;
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
  if (moc.validationState === "approved" && isController) actions.push("register");
  if (moc.validationState === "registered" && moc.registerStatus !== "Closed" && isController) actions.push("advance");
  return actions;
}

export function nextRegisterStatus(current: MocRegisterStatus): MocRegisterStatus | null {
  const i = MOC_REGISTER_STATUSES.indexOf(current);
  return i >= 0 && i < MOC_REGISTER_STATUSES.length - 1 ? MOC_REGISTER_STATUSES[i + 1] : null;
}

// Usulan Nomor MoC — TKO tidak mendefinisikan format; ini hanya usulan yang dapat
// diubah Controller saat registrasi.
export function suggestMocNumber(location: string, year: number, sequence: number): string {
  const code = location.replace(/^(FT|IT|AFT)\s+/i, "").toUpperCase().replace(/\s+/g, "");
  return `MOC-${code}-${year}-${String(sequence).padStart(3, "0")}`;
}

// Isian minimum agar draf boleh diajukan ke reviewer. Mengembalikan daftar masalah.
export function mocSubmitIssues(form: MocFormContent): string[] {
  const issues: string[] = [];
  if (!form.judul.trim()) issues.push("Judul perubahan wajib diisi.");
  if (form.changeCategories.length === 0) issues.push("Pilih minimal satu aktivitas / ruang lingkup perubahan.");
  if (!form.deskripsi.trim()) issues.push("Deskripsi perubahan wajib diisi.");
  if (!form.initiatorName.trim() || !form.initiatorJabatan.trim()) issues.push("Nama dan jabatan Initiator wajib diisi.");
  if (form.sifatPerubahan === "Sementara" && (!form.validFrom || !form.validUntil)) {
    issues.push("Perubahan Sementara wajib punya masa berlaku (dari-sampai).");
  }
  if (form.validFrom && form.validUntil && form.validUntil < form.validFrom) {
    issues.push("Tanggal akhir masa berlaku tidak boleh sebelum tanggal awal.");
  }
  if (!form.severity || !form.probability) issues.push("Tingkat keparahan dan probabilitas risiko wajib diisi.");
  if (!form.riskLevel) issues.push("Tingkat risiko (L/M/H) wajib dipilih.");
  return issues;
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

// Ringkasan jelas: MOC ini SEKARANG menunggu siapa dan apa — supaya user tidak
// bingung apakah input mereka sudah masuk.
export function mocWaitingOn(moc: MocRequest): { title: string; detail: string; done: boolean } {
  switch (moc.validationState) {
    case "draft":
      return { title: "Draf — belum diajukan", detail: "Initiator melengkapi formulir lalu memilih Reviewer dan Approver untuk diajukan.", done: false };
    case "returned":
      return { title: "Dikembalikan ke Initiator", detail: "Ada reviewer yang meminta perubahan. Initiator memperbaiki lalu mengajukan ulang.", done: false };
    case "rejected":
      return { title: "Ditolak Approver", detail: `Initiator memperbaiki sesuai catatan Approver${moc.approverNote ? ` (“${moc.approverNote}”)` : ""} lalu mengajukan ulang.`, done: false };
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
    case "registered":
      if (moc.registerStatus === "Closed") return { title: "MOC selesai (Closed)", detail: MOC_LATER_STAGE_INFO.Closed, done: true };
      if (moc.registerStatus === "Inisiasi & Validasi") {
        return { title: "Terdaftar — siap masuk Implementasi", detail: "MoC Controller memajukan MOC ke tahap Implementasi.", done: false };
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
  decide: "Putuskan",
  register: "Daftarkan",
  advance: "Majukan tahap",
};

// Tindakan yang benar-benar "menunggu" user (tanpa 'edit' dan 'advance' yang selalu
// tersedia) — dasar lencana Navbar, notifikasi, dan kelompok "Perlu tindakan Anda".
export function mocPendingActions(moc: MocRequest, actor: MocActor): MocAction[] {
  return mocActionsFor(moc, actor).filter((a) => a === "submit" || a === "review" || a === "decide" || a === "register");
}
