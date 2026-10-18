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
  /** Nama sub-kategori Direktori (mis. "HAC Layout") — undefined untuk dokumen lama yang
   * belum ditautkan ke kategori manapun. Dipakai supaya pencarian topbar bisa menemukan
   * dokumen lewat nama sub-foldernya, bukan cuma judul/nomor dokumen literal. */
  categoryName?: string;
  categoryId?: string;
  routes: ApprovalRouteItem[];
  history: HistoryItem[];
  isCircular: boolean;
}

export interface LocationTarget {
  locationName: string;
  // 'Plant' ditambahkan 2026-09-28 untuk "Bitumen Plant Gresik" — satu-satunya lokasi
  // yang tidak mengikuti pola nama IT/FT/AFT (lihat 28-daftar lokasi real dari client).
  // 'REG' = unit Regional Jatimbalinus (hanya untuk MOC level regional; bukan terminal PSI — lihat regionalUnit.ts).
  locationType: 'IT' | 'FT' | 'AFT' | 'Plant' | 'REG';
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
  /** Hanya dikirim ke Admin Regional (layar Kelola User). */
  emailVerifiedAt?: string | null;
  mfaEnabled?: boolean;
  /** Akun dengan sandi awal: harus ganti sandi sebelum memakai portal. */
  mustChangePassword?: boolean;
  /** Self-selected preferences from the Register form, shown to the Admin Regional as
   * suggested defaults on the activation screen. Never granted until approved. */
  requestedRole?: string | null;
  requestedLocation?: string | null;
  // Usulan peran MOC + fungsi dari layar "Lengkapi Profil" (hanya usulan, lihat requestedRole).
  requestedMocRoles?: string[];
  requestedMocFunction?: string | null;
  // Peran MOC per akun (Reviewer/Approver/Performer) + fungsi; lihat domain/moc.ts.
  mocRoles?: string[];
  mocFunction?: string | null;
}

// Poin #5 & #9 Klien: "sirkuler cuma untuk beberapa jenis PSI aja, yang lain langsung ke
// riwayat versi". Nilai di bawah ini masih PLACEHOLDER (semua di-default wajib sirkuler)
// sampai dikonfirmasi ke client kategori mana yang sebenarnya tidak perlu sirkuler.
export type LastUpdateType = 'Baru' | 'Direvisi' | 'Diperpanjang';
