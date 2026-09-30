// Curated seed/demo data only. Types and pure business-rule functions now live in
// ./domain (moved there when the real backend was added, so API routes and the
// migration scripts can import them without pulling in this file's mock arrays) —
// re-exported here so every existing `from "@/lib/mockData"` import across the app
// keeps working unchanged.
export * from "./domain/types";
export * from "./domain/rules";

import { DocumentItem, LocationTarget, SimulatedUser } from "./domain/types";

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
  // Added 2026-09-04 — one login per remaining terminal (IT Bima, AFT Eltari, FT
  // Madiun had no demo account yet) so the per-location dashboard can actually be
  // tested against every REGIONAL_LOCATIONS entry, not just FT Malang/IT Surabaya.
  {
    id: 'user-5',
    name: 'Made Wirawan',
    role: 'Penanggung Jawab PSI (Initiator)',
    location: 'IT Bima',
    isRegionalAdmin: false
  },
  {
    id: 'user-6',
    name: 'Yohanes Bureni',
    role: 'PSI / MOC Controller',
    location: 'AFT Eltari',
    isRegionalAdmin: false
  },
  {
    id: 'user-7',
    name: 'Siti Rahayu',
    role: 'Penanggung Jawab PSI (Initiator)',
    location: 'FT Madiun',
    isRegionalAdmin: false
  },
  // Added 2026-09-25 — a full MOC cast for FT Malang so the reviewer/approver/performer
  // steps can be simulated with distinct people (Budi = Initiator, Agnes = Controller
  // already exist). `role` only has 3 values, so reviewers/approver/performer carry the
  // Initiator role; who acts as Reviewer/Approver/Performer is decided per-MOC, not by
  // this field. Modelling gap: dedicated MOC roles do not exist yet.
  {
    id: 'user-8',
    name: 'Rina Kusuma', // simulasi: MoC Reviewer — Maintenance Service
    role: 'Penanggung Jawab PSI (Initiator)',
    location: 'FT Malang',
    isRegionalAdmin: false,
    mocRoles: ['Reviewer'],
    mocFunction: 'Maintenance Service'
  },
  {
    id: 'user-9',
    name: 'Dedi Hartono', // simulasi: MoC Reviewer — HSSE
    role: 'Penanggung Jawab PSI (Initiator)',
    location: 'FT Malang',
    isRegionalAdmin: false,
    mocRoles: ['Reviewer'],
    mocFunction: 'HSSE'
  },
  {
    id: 'user-10',
    name: 'Bagus Prakoso', // simulasi: MoC Approver — Terminal Manager
    role: 'Penanggung Jawab PSI (Initiator)',
    location: 'FT Malang',
    isRegionalAdmin: false,
    mocRoles: ['Approver'],
    mocFunction: 'Terminal Manager'
  },
  {
    id: 'user-11',
    name: 'Wahyu Nugroho', // simulasi: MoC Performer
    role: 'Penanggung Jawab PSI (Initiator)',
    location: 'FT Malang',
    isRegionalAdmin: false,
    mocRoles: ['Performer'],
    mocFunction: 'Operasi'
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
    locationName: 'IT Bima',
    locationType: 'IT',
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
    fileUrl: '/sample-docs/eca-ft-malang.pdf',
    isCircular: true,
    routes: [
      { approverRole: 'PSI Controller', approverName: 'Agnes Wijaya', stepOrder: 1, status: 'Approved', actionDate: '2024-03-11' },
      { approverRole: 'Facility Manager', approverName: 'Rahmat Hidayat', stepOrder: 2, status: 'Approved', actionDate: '2024-03-12' }
    ],
    history: [
      { id: 'h-1', timestamp: '2024-03-10 09:15', actorName: 'Budi Santosa', actorRole: 'Initiator', location: 'FT Malang', action: 'Created', notes: 'Mengajukan dokumen ECA baru', fileUrl: '/sample-docs/eca-ft-malang.pdf', version: '2.0' },
      { id: 'h-2', timestamp: '2024-03-11 11:30', actorName: 'Agnes Wijaya', actorRole: 'PSI Controller', location: 'FT Malang', action: 'Approved', notes: 'Pemeriksaan teknis aman', fileUrl: '/sample-docs/eca-ft-malang.pdf', version: '2.0' },
      { id: 'h-3', timestamp: '2024-03-12 14:00', actorName: 'Rahmat Hidayat', actorRole: 'Facility Manager', location: 'FT Malang', action: 'Approved', notes: 'Disetujui untuk operasi', fileUrl: '/sample-docs/eca-ft-malang.pdf', version: '2.0' }
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
    location: 'IT Bima',
    currentVersion: '1.0',
    status: 'Approved',
    issueDate: '2019-10-15',
    expiryDate: '2024-10-15', // 2024 = mendekati expired 5 tahun!
    fileUrl: '/sample-docs/sece-mah-2025-ft-bima.xlsx',
    isCircular: false,
    routes: [],
    history: [
      { id: 'h-7', timestamp: '2019-10-15 14:00', actorName: 'Manager Bima', actorRole: 'Initiator', location: 'IT Bima', action: 'Created', notes: 'Direct approved dokumen SECE', fileUrl: '/sample-docs/sece-mah-2025-ft-bima.xlsx', version: '1.0' }
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
    fileUrl: '/sample-docs/mah-sece-2025-aft-eltari.xlsx',
    isCircular: true,
    routes: [
      { approverRole: 'Aviation Safety Inspector', approverName: 'Anton Kusuma', stepOrder: 1, status: 'Rejected', actionDate: '2024-05-03', comment: 'Harap perbarui diagram diagram pipa bahan bakar avtur.' }
    ],
    history: [
      { id: 'h-8', timestamp: '2024-05-01 10:00', actorName: 'Staff Eltari', actorRole: 'Initiator', location: 'AFT Eltari', action: 'Forwarded', notes: 'Pengajuan dokumen MAH SECE 2025', fileUrl: '/sample-docs/mah-sece-2025-aft-eltari.xlsx', version: '1.0' },
      { id: 'h-9', timestamp: '2024-05-03 16:20', actorName: 'Anton Kusuma', actorRole: 'PSI Controller', location: 'AFT Eltari', action: 'Rejected', notes: 'Ditolak: Harap perbarui diagram pipa bahan bakar avtur.', fileUrl: '/sample-docs/mah-sece-2025-aft-eltari.xlsx', version: '1.0' }
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
    fileUrl: '/sample-docs/control-ps-sece-form-ft-madiun.xlsx',
    isCircular: false,
    routes: [],
    history: [
      { id: 'h-10', timestamp: '2024-02-14 11:15', actorName: 'Initiator Madiun', actorRole: 'Initiator', location: 'FT Madiun', action: 'Created', notes: 'Direct approved', fileUrl: '/sample-docs/control-ps-sece-form-ft-madiun.xlsx', version: '1.0' }
    ]
  },
  // Poin dari klien: contoh dokumen di bawah ini dibuat mengikuti nama berkas & kategori
  // asli dari arsip "02. Process Safety" (SECE, HAZID/HAZOP, LPS, Audit PSAIMS) supaya
  // data contoh mencerminkan dokumen sungguhan, bukan cuma nama karangan.
  {
    id: 'doc-8',
    documentNumber: 'PSI-MALANG-2025-021',
    title: 'SECE - FT Malang',
    psiType: 'Informasi Peralatan',
    lifecyclePhase: 'Operasi',
    location: 'FT Malang',
    currentVersion: '1.0',
    status: 'Approved',
    issueDate: '2025-01-15',
    expiryDate: '2030-01-15',
    fileUrl: '/sample-docs/sece-ft-malang.xlsx',
    isCircular: false,
    routes: [],
    history: [
      { id: 'h-11', timestamp: '2025-01-15 09:00', actorName: 'Budi Santosa', actorRole: 'Initiator', location: 'FT Malang', action: 'Created', notes: 'Registrasi ulang daftar Safety Critical Element (SECE) FT Malang', fileUrl: '/sample-docs/sece-ft-malang.xlsx', version: '1.0' }
    ]
  },
  {
    id: 'doc-9',
    documentNumber: 'PSI-SURABAYA-2025-014',
    title: 'HAZID Perhitungan Overfill Tangki - IT Surabaya',
    psiType: 'Informasi Teknologi Proses',
    lifecyclePhase: 'Operasi',
    location: 'IT Surabaya',
    currentVersion: '1.0',
    status: 'Approved',
    issueDate: '2025-03-12',
    expiryDate: '2030-03-12',
    fileUrl: '/sample-docs/hazid-overfill-it-surabaya.xlsx',
    isCircular: true,
    routes: [
      { approverRole: 'MOC Controller', approverName: 'Hendrik Pratama', stepOrder: 1, status: 'Approved', actionDate: '2025-03-13' }
    ],
    history: [
      { id: 'h-12', timestamp: '2025-03-12 10:20', actorName: 'Staff Surabaya', actorRole: 'Initiator', location: 'IT Surabaya', action: 'Forwarded', notes: 'Kajian HAZID perhitungan overfill tangki timbun', fileUrl: '/sample-docs/hazid-overfill-it-surabaya.xlsx', version: '1.0' },
      { id: 'h-13', timestamp: '2025-03-13 15:40', actorName: 'Hendrik Pratama', actorRole: 'MOC Controller', location: 'IT Surabaya', action: 'Approved', notes: 'Perhitungan overfill sesuai standar', fileUrl: '/sample-docs/hazid-overfill-it-surabaya.xlsx', version: '1.0' }
    ]
  },
  {
    id: 'doc-10',
    documentNumber: 'PSI-SURABAYA-2025-018',
    title: 'TKI Pemeriksaan Grounding System - IT Surabaya',
    psiType: 'Sistem Tata Kerja',
    lifecyclePhase: 'Operasi',
    location: 'IT Surabaya',
    currentVersion: '1.0',
    status: 'In Routing',
    issueDate: '2025-09-01',
    expiryDate: '2030-09-01',
    fileUrl: '/sample-docs/tki-grounding-it-surabaya.pdf',
    isCircular: true,
    routes: [
      { approverRole: 'MOC Controller', approverName: 'Hendrik Pratama', stepOrder: 1, status: 'Pending' }
    ],
    history: [
      { id: 'h-14', timestamp: '2025-09-01 08:45', actorName: 'Staff Surabaya', actorRole: 'Initiator', location: 'IT Surabaya', action: 'Forwarded', notes: 'Tata kerja inspeksi sistem grounding tangki timbun', fileUrl: '/sample-docs/tki-grounding-it-surabaya.pdf', version: '1.0' }
    ]
  },
  {
    id: 'doc-11',
    documentNumber: 'PSI-ELTARI-2025-009',
    title: 'Fire Risk Card Tangki 01 - AFT Eltari',
    psiType: 'Informasi Peralatan',
    lifecyclePhase: 'Operasi',
    location: 'AFT Eltari',
    currentVersion: '1.0',
    status: 'Approved',
    issueDate: '2025-02-20',
    expiryDate: '2030-02-20',
    fileUrl: '/sample-docs/fire-risk-card-tangki-01-aft-eltari.xlsx',
    isCircular: false,
    routes: [],
    history: [
      { id: 'h-15', timestamp: '2025-02-20 13:10', actorName: 'Staff Eltari', actorRole: 'Initiator', location: 'AFT Eltari', action: 'Created', notes: 'Kartu risiko kebakaran Tangki 01', fileUrl: '/sample-docs/fire-risk-card-tangki-01-aft-eltari.xlsx', version: '1.0' }
    ]
  },
  {
    id: 'doc-12',
    documentNumber: 'PSI-ELTARI-2025-011',
    title: 'Analisa Perhitungan Bundwall - AFT Eltari',
    psiType: 'Informasi Teknologi Proses',
    lifecyclePhase: 'Operasi',
    location: 'AFT Eltari',
    currentVersion: '1.0',
    status: 'Revision Required',
    issueDate: '2025-05-10',
    expiryDate: '2030-05-10',
    fileUrl: '/sample-docs/analisa-bundwall-aft-eltari.xlsx',
    isCircular: true,
    routes: [
      { approverRole: 'PSI Controller', approverName: 'Anton Kusuma', stepOrder: 1, status: 'Rejected', actionDate: '2025-05-14', comment: 'Perhitungan kapasitas tampung bundwall perlu direvisi mengikuti volume tangki terbaru.' }
    ],
    history: [
      { id: 'h-16', timestamp: '2025-05-10 09:30', actorName: 'Staff Eltari', actorRole: 'Initiator', location: 'AFT Eltari', action: 'Forwarded', notes: 'Pengajuan analisa perhitungan bundwall', fileUrl: '/sample-docs/analisa-bundwall-aft-eltari.xlsx', version: '1.0' },
      { id: 'h-17', timestamp: '2025-05-14 11:00', actorName: 'Anton Kusuma', actorRole: 'PSI Controller', location: 'AFT Eltari', action: 'Rejected', notes: 'Ditolak: perhitungan kapasitas tampung perlu direvisi.', fileUrl: '/sample-docs/analisa-bundwall-aft-eltari.xlsx', version: '1.0' }
    ]
  },
  {
    id: 'doc-13',
    documentNumber: 'PSI-MADIUN-2025-006',
    title: 'Early Warning System - FT Madiun',
    psiType: 'Informasi Peralatan',
    lifecyclePhase: 'Operasi',
    location: 'FT Madiun',
    currentVersion: '1.0',
    status: 'Approved',
    issueDate: '2025-04-05',
    expiryDate: '2030-04-05',
    fileUrl: 'https://r2.cloudflare-pertamina.com/docs/EWS_FT_MADIUN.pdf',
    isCircular: false,
    routes: [],
    history: [
      { id: 'h-18', timestamp: '2025-04-05 10:00', actorName: 'Initiator Madiun', actorRole: 'Initiator', location: 'FT Madiun', action: 'Created', notes: 'Dokumentasi Early Warning System & FGD FT Madiun', fileUrl: 'https://r2.cloudflare-pertamina.com/docs/EWS_FT_MADIUN.pdf', version: '1.0' }
    ]
  },
  {
    id: 'doc-14',
    documentNumber: 'PSI-MADIUN-2019-003',
    title: 'Sertifikat Penangkal Petir - FT Madiun',
    psiType: 'Informasi Peralatan',
    lifecyclePhase: 'Operasi',
    location: 'FT Madiun',
    currentVersion: '1.0',
    status: 'Expired',
    issueDate: '2019-06-01',
    expiryDate: '2024-06-01',
    fileUrl: '/sample-docs/sertifikat-penangkal-petir-ft-madiun.pdf',
    isCircular: false,
    routes: [],
    history: [
      { id: 'h-19', timestamp: '2019-06-01 09:00', actorName: 'Initiator Madiun', actorRole: 'Initiator', location: 'FT Madiun', action: 'Created', notes: 'Sertifikasi penangkal petir area tangki timbun', fileUrl: '/sample-docs/sertifikat-penangkal-petir-ft-madiun.pdf', version: '1.0' }
    ]
  },
  {
    id: 'doc-15',
    documentNumber: 'PSI-SURABAYA-2025-022',
    title: 'Tindak Lanjut Rekomendasi Audit PSAIMS - IT Surabaya',
    psiType: 'Sistem Tata Kerja',
    lifecyclePhase: 'Operasi',
    location: 'IT Surabaya',
    currentVersion: '1.0',
    status: 'In Routing',
    issueDate: '2025-10-01',
    expiryDate: '2030-10-01',
    fileUrl: '/sample-docs/tindak-lanjut-psaims-it-surabaya.xlsm',
    isCircular: true,
    routes: [
      { approverRole: 'MOC Controller', approverName: 'Hendrik Pratama', stepOrder: 1, status: 'Pending' }
    ],
    history: [
      { id: 'h-20', timestamp: '2025-10-01 08:00', actorName: 'Staff Surabaya', actorRole: 'Initiator', location: 'IT Surabaya', action: 'Forwarded', notes: 'Tindak lanjut rekomendasi hasil audit PSAIMS', fileUrl: '/sample-docs/tindak-lanjut-psaims-it-surabaya.xlsm', version: '1.0' }
    ]
  }
];
