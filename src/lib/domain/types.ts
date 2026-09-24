// Core domain types — the shared contract between the frontend and the API routes.
// Deliberately kept separate from `mockData.ts` (which now holds only the ~15
// curated seed documents + demo users) so these types/pure functions are reachable
// from server-only code (API routes, migration scripts) without pulling in mock
// data arrays that only ever mattered for the pre-backend client-only prototype.

export type DocumentStatus = 'Draft' | 'In Routing' | 'Approved' | 'Revision Required' | 'Expired';

export type PSIType =
  | 'Informasi Bahan Berbahaya'
  | 'Informasi Teknologi Proses'
  | 'Informasi Peralatan'
  | 'Sistem Tata Kerja';

export type LifecyclePhase = 'Proyek' | 'Operasi' | 'Decommissioning';

// Poin klien: klasifikasi "Tipe Audit" terpisah dari Jenis PSI — tidak dipakai untuk
// perhitungan kepatuhan, murni tag tambahan mengikuti daftar prosedur yang dikirim client.
export type AuditType =
  | 'AUDIT K3'
  | 'CSMS'
  | 'Fit to Work'
  | 'IHSB'
  | 'PCT berbasis SPT dan SBT'
  | 'PROPER'
  | 'PSAIMS'
  | 'SMP'
  | 'SUPREME';

export const AUDIT_TYPES: AuditType[] = [
  'AUDIT K3', 'CSMS', 'Fit to Work', 'IHSB', 'PCT berbasis SPT dan SBT', 'PROPER', 'PSAIMS', 'SMP', 'SUPREME',
];

export interface ApprovalRouteItem {
  approverRole: string;
  approverName: string;
  stepOrder: number; // 1 = Tahap Pertama, 2 = Tahap Kedua (Sekuensial / Paralel jika sama)
  status: 'Pending' | 'Approved' | 'Rejected';
  actionDate?: string;
  comment?: string;
}

// Perbandingan nilai lama vs baru untuk satu field yang berubah akibat sebuah aksi —
// dipakai untuk menampilkan "log perubahan" bergaya diff di riwayat proses.
export interface HistoryFieldDiff {
  field: string;
  oldValue: string;
  newValue: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  location: string;
  action: 'Created' | 'Forwarded' | 'Approved' | 'Rejected' | 'Extended Validity' | 'Revised' | 'Closed';
  notes?: string;
  // Snapshot berkas & versi dokumen PADA SAAT entri riwayat ini terjadi — dipakai untuk
  // download per-versi (bukan cuma versi/file terbaru dari dokumen induknya). Backed by
  // GET /api/files/:fileId/download once the backend is live (see file_registry).
  fileUrl: string;
  /** Original filename of this version snapshot's file — see DocumentItem.fileName. */
  fileName?: string;
  version: string;
  // Rincian field yang berubah pada aksi ini (nilai lama vs baru) — opsional, cuma
  // diisi untuk aksi yang benar-benar mengubah data dokumen.
  diff?: HistoryFieldDiff[];
}

export interface DocumentItem {
  id: string;
  documentNumber: string;
  title: string;
  psiType: PSIType;
  auditType?: AuditType;
  lifecyclePhase: LifecyclePhase;
  location: string;
  currentVersion: string;
  status: DocumentStatus;
  issueDate: string;
  expiryDate: string; // ISO String or YYYY-MM-DD
  fileUrl: string;
  /** Original filename of the primary file (e.g. "ECA-FT MALANG_SIGN.PDF") — lets the
   * client tell PDF/spreadsheet/other apart for preview purposes, since fileUrl itself
   * is an opaque /api/files/:id/download route with no extension in it. */
  fileName?: string;
  routes: ApprovalRouteItem[];
  history: HistoryItem[];
  isCircular: boolean;
}

export interface LocationTarget {
  locationName: string;
  locationType: 'IT' | 'FT' | 'AFT';
  region: string;
  targets: Record<PSIType, number>;
}

export interface SimulatedUser {
  id: string;
  name: string;
  role: 'Penanggung Jawab PSI (Initiator)' | 'PSI / MOC Controller' | 'Admin Regional';
  /** null = self-registered account with no location assigned yet — locked out of the
   * whole app (see AuthGuard.tsx) until an Admin Regional assigns one. Only ever null
   * for accounts created via the Register form; the 4 built-in demo users always have one. */
  location: string | null;
  isRegionalAdmin?: boolean;
  /** Only set for accounts created via the Register form — the 4 built-in demo users
   * derive a mocked @gmail.com address from their name instead (see login/page.tsx). */
  email?: string;
  /** Self-selected preferences from the Register form, shown to the Admin Regional as
   * suggested defaults on the activation screen. Never granted until approved. */
  requestedRole?: string | null;
  requestedLocation?: string | null;
}

// Poin #5 & #9 Klien: "sirkuler cuma untuk beberapa jenis PSI aja, yang lain langsung ke
// riwayat versi". Nilai di bawah ini masih PLACEHOLDER (semua di-default wajib sirkuler)
// sampai dikonfirmasi ke client kategori mana yang sebenarnya tidak perlu sirkuler.
export const PSI_TYPE_REQUIRES_CIRCULAR: Record<PSIType, boolean> = {
  'Informasi Bahan Berbahaya': true,
  'Informasi Teknologi Proses': true,
  'Informasi Peralatan': true,
  'Sistem Tata Kerja': true,
};

export type LastUpdateType = 'Baru' | 'Direvisi' | 'Diperpanjang';
