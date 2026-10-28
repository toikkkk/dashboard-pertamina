// Pure business-rule functions — no React, no DOM, no "use client". Safe to import
// from both client components and server-only API routes. These were moved out of
// mockData.ts verbatim (same logic, same comments) when the real backend was added,
// specifically so API route handlers (approve/reject/etc.) can reuse the exact same
// rules the client already enforced, instead of re-deriving them server-side and
// risking drift. See rbac.ts for the location-scoping half of authorization — this
// file is the workflow-state half (who can act on what, given routing state).
import { DocumentItem, HistoryItem, SimulatedUser, LastUpdateType } from "./types";

// Sub-dokumen bukti pendukung HAZID/HAZOP (permintaan client 16 Okt 2026): tersimpan dan bisa dicari, tetapi
// TIDAK dihitung di visualisasi dashboard (kedaluwarsa, berakhir, evaluasi tahunan, jadwal, badge Overdue).
export const EVIDENCE_PHA_CATEGORY = "Evidence PHA";
export function isEvidenceDoc(doc: Pick<DocumentItem, "categoryName">): boolean {
  return doc.categoryName === EVIDENCE_PHA_CATEGORY;
}

// Status "Digantikan" (permintaan client 14 Okt 2026): versi lama yang sudah ada penggantinya ditandai MANUAL.
// Dicatat sebagai riwayat Revised bernada "Digantikan: oleh <nomor> - <judul> [<id>]"; entri "Aktif kembali:"
// membatalkannya. Dokumen tetap tersimpan sebagai riwayat versi tetapi tidak dihitung di kedaluwarsa, berakhir,
// dan perlu evaluasi tahunan (lihat isExcludedFromDashboard). Tanpa kolom baru di database.
export const SUPERSEDE_NOTE_PREFIX = "Digantikan:";
export const UNSUPERSEDE_NOTE_PREFIX = "Aktif kembali:";
export function isSupersedeEntry(h: Pick<HistoryItem, "action" | "notes">): boolean {
  const n = h.notes ?? "";
  return h.action === "Revised" && (n.startsWith(SUPERSEDE_NOTE_PREFIX) || n.startsWith(UNSUPERSEDE_NOTE_PREFIX));
}
// Keterangan penggantian bila dokumen sedang berstatus Digantikan (entri terbaru di antara Digantikan/Aktif kembali).
export function supersededInfo(doc: Pick<DocumentItem, "history">): { text: string; byId: string | null } | null {
  for (let i = doc.history.length - 1; i >= 0; i--) {
    const h = doc.history[i];
    if (h.action !== "Revised") continue;
    const n = h.notes ?? "";
    if (n.startsWith(UNSUPERSEDE_NOTE_PREFIX)) return null;
    if (n.startsWith(SUPERSEDE_NOTE_PREFIX)) {
      const idMatch = /\[([0-9a-f-]{36})\]\s*$/.exec(n);
      return { text: n.slice(SUPERSEDE_NOTE_PREFIX.length).replace(/\s*\[[0-9a-f-]{36}\]\s*$/, "").trim(), byId: idMatch ? idMatch[1] : null };
    }
  }
  return null;
}
export function isSupersededDoc(doc: Pick<DocumentItem, "history">): boolean {
  return supersededInfo(doc) !== null;
}
// Tidak dihitung di visualisasi dashboard: bukti pendukung (Evidence PHA) dan versi lama yang Digantikan.
export function isExcludedFromDashboard(doc: Pick<DocumentItem, "categoryName" | "history">): boolean {
  return isEvidenceDoc(doc) || isSupersededDoc(doc);
}

// Penanda riwayat "dokumen sudah ditinjau" (evaluasi tahunan): aksi Revised dengan catatan berawalan ini. Bukan
// pembaruan isi dokumen; hanya mencatat bahwa dokumen dicek dan masih valid.
export const REVIEW_NOTE_PREFIX = "Ditinjau:";
export function isReviewEntry(h: Pick<HistoryItem, "action" | "notes">): boolean {
  return h.action === "Revised" && (h.notes ?? "").startsWith(REVIEW_NOTE_PREFIX);
}

// Poin #7 Klien (Dilema 5-Tahun): bedakan dokumen yang cuma "diperpanjang" (tanpa
// perubahan teknis) dari yang benar "direvisi" (ada perubahan fasilitas/konten).
// Dicari dari entri riwayat terakhir yang benar-benar berupa perubahan berkas/versi —
// entri seperti Approved/Rejected/Forwarded dilewati karena bukan aksi update konten.
export function getLastUpdateType(history: HistoryItem[]): LastUpdateType {
  const contentActions: HistoryItem['action'][] = ['Created', 'Extended Validity', 'Revised'];
  const lastContentUpdate = [...history].reverse().find((h) => contentActions.includes(h.action) && !isReviewEntry(h) && !isSupersedeEntry(h));

  if (!lastContentUpdate || lastContentUpdate.action === 'Created') return 'Baru';
  if (lastContentUpdate.action === 'Extended Validity') return 'Diperpanjang';
  return 'Direvisi';
}

// Tahap sirkuler paling awal yang masih Pending untuk dokumen ini (null kalau tidak ada
// yang pending, mis. dokumen sudah Approved atau tidak memakai sirkuler sama sekali).
export function getPendingApprovalStepOrder(doc: DocumentItem): number | null {
  const pendingSteps = doc.routes.filter((r) => r.status === 'Pending').map((r) => r.stepOrder);
  return pendingSteps.length > 0 ? Math.min(...pendingSteps) : null;
}

// Overdue = expiryDate sudah lewat hari ini, ATAU status sudah eksplisit "Expired".
// Dipakai bersama oleh badge nav "Overdue" (Navbar) dan tabel /dilemma agar keduanya
// selalu menghitung himpunan dokumen yang sama — sebelumnya tabel memakai cutoff tahun
// yang di-hardcode (expiryYear <= 2025), yang jadi salah begitu tanggal hari ini lewat
// 2025 dan juga bisa meloloskan dokumen yang statusnya bukan "Expired" tapi tahunnya
// kebetulan cocok, walau expiryDate-nya sendiri belum tentu benar-benar sudah lewat.
export function isDocOverdue(doc: DocumentItem): boolean {
  if (doc.status === 'Expired') return true;
  const expiry = new Date(doc.expiryDate + 'T00:00:00');
  if (isNaN(expiry.getTime())) return false;
  return expiry.getTime() < Date.now();
}

// Apakah user ini berwenang menyetujui dokumen pada tahap sirkuler yang sedang pending.
// This is the CLIENT-facing convenience check (controls whether the approve/reject UI
// renders at all) — server-side API routes must call this same function again before
// mutating, never trust that a request only arrived because the button was visible.
/**
 * Hak atas Sampah: memindahkan dokumen ke Sampah, memulihkan, dan menghapus permanen. Sejak 2026-10-10 berlaku untuk
 * SEMUA user yang punya hak tulis di lokasi dokumen itu (peran apa pun: Initiator, Controller) dan Admin Regional
 * (semua lokasi); user lokasi lain atau akun yang menunggu aktivasi tidak berhak. Dicek ulang di server
 * (lib/api/trash.ts); ini juga dipakai menampilkan/menyembunyikan tombolnya.
 */
/**
 * Hak "Ubah data dokumen" (judul, nomor, jenis PSI, tanggal terbit, deskripsi): hanya Penanggung Jawab PSI (Initiator)
 * di lokasi dokumen itu. Controller lokasi dan Admin Regional tidak lagi (permintaan client 2026-10-28). Dicek ulang
 * di PATCH /api/documents/[id]; ini juga dipakai menampilkan/menyembunyikan tombolnya.
 */
export function canEditDocumentData(user: { isRegionalAdmin?: boolean; role: string; location: string | null }, docLocation: string): boolean {
  return !user.isRegionalAdmin && user.role === "Penanggung Jawab PSI (Initiator)" && !!user.location && user.location === docLocation;
}

export function canDeleteDocument(user: { isRegionalAdmin?: boolean; role: string; location: string | null }, docLocation: string): boolean {
  return !!user.isRegionalAdmin || (!!user.location && user.location === docLocation);
}

export function canUserApproveDoc(doc: DocumentItem, user: SimulatedUser): boolean {
  if (doc.status !== 'In Routing') return false;
  // Lihat-saja lintas lokasi: user lokasi boleh MELIHAT dokumen lokasi lain, tapi
  // tidak boleh menyetujuinya — tanpa cek ini Controller lokasi A akan melihat tombol
  // setujui pada dokumen lokasi B (server memang menolak, tapi UI tidak boleh menawarkan).
  if (!user.isRegionalAdmin && user.location !== doc.location) return false;
  const stepOrder = getPendingApprovalStepOrder(doc);
  if (stepOrder === null) return false;
  return doc.routes.some(
    (r) =>
      r.stepOrder === stepOrder &&
      r.status === 'Pending' &&
      (r.approverName === user.name || user.role.includes('Controller') || user.isRegionalAdmin)
  );
}

// The 4 built-in demo users don't carry a real `email` field — this derives the same
// mocked @gmail.com address consistently everywhere it's displayed or matched
// against (login lookup, admin user list). Self-registered accounts always have a
// real `email` already, so this is only ever a fallback for them (`u.email ?? ...`).
export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordRequirement {
  key: string;
  label: string;
  met: (password: string) => boolean;
}

// Single source of truth for password strength — both the register API route's zod
// schema and the register form's live checklist read this same list, so the
// checkmarks the user watches fill in can never drift from what the server actually
// enforces. Deliberately NOT applied to login (an existing password must always be
// checked against whatever rules were in force when it was set, not today's rules).
export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { key: "length", label: `Minimal ${PASSWORD_MIN_LENGTH} karakter`, met: (p) => p.length >= PASSWORD_MIN_LENGTH },
  { key: "upper", label: "1 huruf kapital (A-Z)", met: (p) => /[A-Z]/.test(p) },
  { key: "lower", label: "1 huruf kecil (a-z)", met: (p) => /[a-z]/.test(p) },
  { key: "digit", label: "1 angka (0-9)", met: (p) => /[0-9]/.test(p) },
  { key: "special", label: "1 simbol (!@#$ dll)", met: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function passwordPolicyIssues(password: string): string[] {
  return PASSWORD_REQUIREMENTS.filter((r) => !r.met(password)).map((r) => r.label.toLowerCase());
}

// Email penanda akun sungguhan yang belum diganti pemiliknya (tidak bisa menerima email, tidak pernah terverifikasi).
export const PLACEHOLDER_EMAIL_DOMAIN = "akun.portal.invalid";
export const isPlaceholderEmail = (email: string | null | undefined) => (email ?? "").toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);

export function isPasswordStrong(password: string): boolean {
  return passwordPolicyIssues(password).length === 0;
}

export function deriveDemoEmail(name: string): string {
  // Collapse runs of separators (e.g. "Ir. Irwan" -> ". " -> one "." not two) and
  // trim leading/trailing dots — a name with an abbreviation like "Ir." otherwise
  // produces "ir..irwan...@gmail.com", which the login/register routes' zod
  // email schema (rejects consecutive dots, RFC-adjacent) then refuses forever.
  const local = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return `${local}@gmail.com`;
}
