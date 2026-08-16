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

export interface HistoryItem {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  location: string;
  action: 'Created' | 'Forwarded' | 'Approved' | 'Rejected' | 'Extended Validity' | 'Revised';
  notes?: string;
  // Snapshot berkas & versi dokumen PADA SAAT entri riwayat ini terjadi — dipakai untuk
  // download per-versi (bukan cuma versi/file terbaru dari dokumen induknya).
  fileUrl: string;
  version: string;
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
  location: string;
  isRegionalAdmin?: boolean;
}

export const SIMULATED_USERS: SimulatedUser[] = [
  {
    id: 'user-1',
    name: 'Budi Santosa',
    role: 'Penanggung Jawab PSI (Initiator)',
    location: 'FT Malang',
    isRegionalAdmin: false
  },
  {
    id: 'user-2',
    name: 'Agnes Wijaya',
    role: 'PSI / MOC Controller',
    location: 'FT Malang',
    isRegionalAdmin: false
  },
  {
    id: 'user-3',
    name: 'Hendrik Pratama',
    role: 'PSI / MOC Controller',
    location: 'IT Surabaya',
    isRegionalAdmin: false
  },
  {
    id: 'user-4',
    name: 'Ir. Irwan Kurniawan',
    role: 'Admin Regional',
    location: 'Regional Jatimbalinus (Semua Lokasi)',
    isRegionalAdmin: true
  }
];

export const REGIONAL_LOCATIONS: LocationTarget[] = [
  {
    locationName: 'FT Malang',
    locationType: 'FT',
    region: 'Jatimbalinus',
    targets: {
      'Informasi Bahan Berbahaya': 3,
      'Informasi Teknologi Proses': 4,
      'Informasi Peralatan': 5,
      'Sistem Tata Kerja': 4
    }
  },
  {
    locationName: 'IT Surabaya',
    locationType: 'IT',
    region: 'Jatimbalinus',
    targets: {
      'Informasi Bahan Berbahaya': 5,
      'Informasi Teknologi Proses': 6,
      'Informasi Peralatan': 8,
      'Sistem Tata Kerja': 6
    }
  },
  {
    locationName: 'FT Bima',
    locationType: 'FT',
    region: 'Jatimbalinus',
    targets: {
      'Informasi Bahan Berbahaya': 2,
      'Informasi Teknologi Proses': 3,
      'Informasi Peralatan': 4,
      'Sistem Tata Kerja': 3
    }
  },
  {
    locationName: 'AFT Eltari',
    locationType: 'AFT',
    region: 'Jatimbalinus',
    targets: {
      'Informasi Bahan Berbahaya': 2,
      'Informasi Teknologi Proses': 3,
      'Informasi Peralatan': 3,
      'Sistem Tata Kerja': 3
    }
  },
  {
    locationName: 'FT Madiun',
    locationType: 'FT',
    region: 'Jatimbalinus',
    targets: {
      'Informasi Bahan Berbahaya': 2,
      'Informasi Teknologi Proses': 3,
      'Informasi Peralatan': 4,
      'Sistem Tata Kerja': 3
    }
  }
];

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-1',
    documentNumber: 'PSI-MALANG-2024-001',
    title: 'PCE & Criticality (ECA) - FT Malang',
    psiType: 'Informasi Peralatan',
    lifecyclePhase: 'Operasi',
    location: 'FT Malang',
    currentVersion: '2.0',
    status: 'Approved',
    issueDate: '2024-03-10',
    expiryDate: '2029-03-10',
    fileUrl: 'https://r2.cloudflare-pertamina.com/docs/ECA_FT_MALANG_v2.0.pdf',
    isCircular: true,
    routes: [
      { approverRole: 'PSI Controller', approverName: 'Agnes Wijaya', stepOrder: 1, status: 'Approved', actionDate: '2024-03-11' },
      { approverRole: 'Facility Manager', approverName: 'Rahmat Hidayat', stepOrder: 2, status: 'Approved', actionDate: '2024-03-12' }
    ],
    history: [
      { id: 'h-1', timestamp: '2024-03-10 09:15', actorName: 'Budi Santosa', actorRole: 'Initiator', location: 'FT Malang', action: 'Created', notes: 'Mengajukan dokumen ECA baru', fileUrl: 'https://r2.cloudflare-pertamina.com/docs/ECA_FT_MALANG_v2.0.pdf', version: '2.0' },
      { id: 'h-2', timestamp: '2024-03-11 11:30', actorName: 'Agnes Wijaya', actorRole: 'PSI Controller', location: 'FT Malang', action: 'Approved', notes: 'Pemeriksaan teknis aman', fileUrl: 'https://r2.cloudflare-pertamina.com/docs/ECA_FT_MALANG_v2.0.pdf', version: '2.0' },
      { id: 'h-3', timestamp: '2024-03-12 14:00', actorName: 'Rahmat Hidayat', actorRole: 'Facility Manager', location: 'FT Malang', action: 'Approved', notes: 'Disetujui untuk operasi', fileUrl: 'https://r2.cloudflare-pertamina.com/docs/ECA_FT_MALANG_v2.0.pdf', version: '2.0' }
    ]
  },
  {
    id: 'doc-2',
    documentNumber: 'PSI-MALANG-2019-010',
    title: 'SOP Penanganan Bahan Bakar Minyak FT Malang',
    psiType: 'Sistem Tata Kerja',
    lifecyclePhase: 'Operasi',
    location: 'FT Malang',
    currentVersion: '1.0',
    status: 'Expired', // Mendekati expired / expired -> memicu The 5-Year Dilemma!
    issueDate: '2019-08-01',
    expiryDate: '2024-08-01',
    fileUrl: 'https://r2.cloudflare-pertamina.com/docs/SOP_BBM_FT_MALANG_v1.0.pdf',
    isCircular: false,
    routes: [],
    history: [
      { id: 'h-4', timestamp: '2019-08-01 10:00', actorName: 'Budi Santosa', actorRole: 'Initiator', location: 'FT Malang', action: 'Created', notes: 'Direct Approved tanpa sirkuler', fileUrl: 'https://r2.cloudflare-pertamina.com/docs/SOP_BBM_FT_MALANG_v1.0.pdf', version: '1.0' }
    ]
  },
  {
    id: 'doc-3',
    documentNumber: 'PSI-MALANG-2024-015',
    title: 'Informasi Bahan Berbahaya & MSDS Tangki T-101',
    psiType: 'Informasi Bahan Berbahaya',
    lifecyclePhase: 'Operasi',
    location: 'FT Malang',
    currentVersion: '1.0',
    status: 'In Routing',
    issueDate: '2024-07-20',
    expiryDate: '2029-07-20',
    fileUrl: 'https://r2.cloudflare-pertamina.com/docs/MSDS_MALANG_v1.0.pdf',
    isCircular: true,
    routes: [
      { approverRole: 'PSI Controller', approverName: 'Agnes Wijaya', stepOrder: 1, status: 'Pending' },
      { approverRole: 'HSE Manager', approverName: 'Dwi Saputra', stepOrder: 1, status: 'Pending' }, // Paralel di step 1!
      { approverRole: 'Facility Manager', approverName: 'Rahmat Hidayat', stepOrder: 2, status: 'Pending' }
    ],
    history: [
      { id: 'h-5', timestamp: '2024-07-20 08:30', actorName: 'Budi Santosa', actorRole: 'Initiator', location: 'FT Malang', action: 'Forwarded', notes: 'Diteruskan untuk persetujuan paralel step 1', fileUrl: 'https://r2.cloudflare-pertamina.com/docs/MSDS_MALANG_v1.0.pdf', version: '1.0' }
    ]
  },
  {
    id: 'doc-4',
    documentNumber: 'PSI-SBY-2024-005',
    title: 'HIRADC & SECE MAH Jatimbalinus 2024',
    psiType: 'Sistem Tata Kerja',
    lifecyclePhase: 'Operasi',
    location: 'IT Surabaya',
    currentVersion: '1.0',
    status: 'In Routing',
    issueDate: '2024-06-15',
    expiryDate: '2029-06-15',
    fileUrl: 'https://r2.cloudflare-pertamina.com/docs/HIRADC_SBY_2024.pdf',
    isCircular: true,
    routes: [
      { approverRole: 'MOC Controller', approverName: 'Hendrik Pratama', stepOrder: 1, status: 'Pending' }
    ],
    history: [
      { id: 'h-6', timestamp: '2024-06-15 09:00', actorName: 'Staff Surabaya', actorRole: 'Initiator', location: 'IT Surabaya', action: 'Forwarded', notes: 'Sirkulasi dokumen HIRADC IT Surabaya', fileUrl: 'https://r2.cloudflare-pertamina.com/docs/HIRADC_SBY_2024.pdf', version: '1.0' }
    ]
  },
  {
    id: 'doc-5',
    documentNumber: 'PSI-BIMA-2025-001',
    title: '2025 SECE MAH - FT Bima',
    psiType: 'Informasi Peralatan',
    lifecyclePhase: 'Operasi',
    location: 'FT Bima',
    currentVersion: '1.0',
    status: 'Approved',
    issueDate: '2019-10-15',
    expiryDate: '2024-10-15', // 2024 = mendekati expired 5 tahun!
    fileUrl: 'https://r2.cloudflare-pertamina.com/docs/SECE_MAH_BIMA_2025.pdf',
    isCircular: false,
    routes: [],
    history: [
      { id: 'h-7', timestamp: '2019-10-15 14:00', actorName: 'Manager Bima', actorRole: 'Initiator', location: 'FT Bima', action: 'Created', notes: 'Direct approved dokumen SECE', fileUrl: 'https://r2.cloudflare-pertamina.com/docs/SECE_MAH_BIMA_2025.pdf', version: '1.0' }
    ]
  },
  {
    id: 'doc-6',
    documentNumber: 'PSI-ELTARI-2025-002',
    title: '2025 MAH SECE - AFT Eltari',
    psiType: 'Informasi Teknologi Proses',
    lifecyclePhase: 'Operasi',
    location: 'AFT Eltari',
    currentVersion: '1.0',
    status: 'Revision Required',
    issueDate: '2024-05-01',
    expiryDate: '2029-05-01',
    fileUrl: 'https://r2.cloudflare-pertamina.com/docs/MAH_SECE_ELTARI_v1.0.pdf',
    isCircular: true,
    routes: [
      { approverRole: 'Aviation Safety Inspector', approverName: 'Anton Kusuma', stepOrder: 1, status: 'Rejected', actionDate: '2024-05-03', comment: 'Harap perbarui diagram diagram pipa bahan bakar avtur.' }
    ],
    history: [
      { id: 'h-8', timestamp: '2024-05-01 10:00', actorName: 'Staff Eltari', actorRole: 'Initiator', location: 'AFT Eltari', action: 'Forwarded', notes: 'Pengajuan dokumen MAH SECE 2025', fileUrl: 'https://r2.cloudflare-pertamina.com/docs/MAH_SECE_ELTARI_v1.0.pdf', version: '1.0' },
      { id: 'h-9', timestamp: '2024-05-03 16:20', actorName: 'Anton Kusuma', actorRole: 'PSI Controller', location: 'AFT Eltari', action: 'Rejected', notes: 'Ditolak: Harap perbarui diagram pipa bahan bakar avtur.', fileUrl: 'https://r2.cloudflare-pertamina.com/docs/MAH_SECE_ELTARI_v1.0.pdf', version: '1.0' }
    ]
  },
  {
    id: 'doc-7',
    documentNumber: 'PSI-MADIUN-2024-002',
    title: 'Control PS SECE Form - FT Madiun',
    psiType: 'Informasi Teknologi Proses',
    lifecyclePhase: 'Operasi',
    location: 'FT Madiun',
    currentVersion: '1.0',
    status: 'Approved',
    issueDate: '2024-02-14',
    expiryDate: '2029-02-14',
    fileUrl: 'https://r2.cloudflare-pertamina.com/docs/CONTROL_PS_MADIUN.pdf',
    isCircular: false,
    routes: [],
    history: [
      { id: 'h-10', timestamp: '2024-02-14 11:15', actorName: 'Initiator Madiun', actorRole: 'Initiator', location: 'FT Madiun', action: 'Created', notes: 'Direct approved', fileUrl: 'https://r2.cloudflare-pertamina.com/docs/CONTROL_PS_MADIUN.pdf', version: '1.0' }
    ]
  }
];

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

// Poin #7 Klien (Dilema 5-Tahun): bedakan dokumen yang cuma "diperpanjang" (tanpa
// perubahan teknis) dari yang benar "direvisi" (ada perubahan fasilitas/konten).
// Dicari dari entri riwayat terakhir yang benar-benar berupa perubahan berkas/versi —
// entri seperti Approved/Rejected/Forwarded dilewati karena bukan aksi update konten.
export function getLastUpdateType(history: HistoryItem[]): LastUpdateType {
  const contentActions: HistoryItem['action'][] = ['Created', 'Extended Validity', 'Revised'];
  const lastContentUpdate = [...history].reverse().find((h) => contentActions.includes(h.action));

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

// Apakah user ini berwenang menyetujui dokumen pada tahap sirkuler yang sedang pending.
export function canUserApproveDoc(doc: DocumentItem, user: SimulatedUser): boolean {
  if (doc.status !== 'In Routing') return false;
  const stepOrder = getPendingApprovalStepOrder(doc);
  if (stepOrder === null) return false;
  return doc.routes.some(
    (r) =>
      r.stepOrder === stepOrder &&
      r.status === 'Pending' &&
      (r.approverName === user.name || user.role.includes('Controller') || user.isRegionalAdmin)
  );
}
