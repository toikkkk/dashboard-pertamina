// Drizzle schema for Neon Postgres. See CLAUDE.md ("Backend / database") for the
// two-tier data model this implements: `fileRegistry` is every physical migrated
// file (no workflow semantics), `documents`/`approvalRoutes`/`historyItems` are the
// curated workflow objects — each references fileRegistry by id instead of holding
// a raw fileUrl string. Column names use snake_case to match plain-SQL conventions;
// Drizzle maps them to camelCase JS property names automatically.

import { pgTable, text, uuid, integer, boolean, timestamp, date, bigint, jsonb, primaryKey, check, uniqueIndex, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Locations & compliance targets
// ---------------------------------------------------------------------------

export const locations = pgTable("locations", {
  name: text("name").primaryKey(),
  locationType: text("location_type").notNull(),
  region: text("region").notNull().default("Jatimbalinus"),
});

export const locationTargets = pgTable(
  "location_targets",
  {
    locationName: text("location_name").notNull().references(() => locations.name),
    psiType: text("psi_type").notNull(),
    target: integer("target").notNull(),
  },
  (t) => [primaryKey({ columns: [t.locationName, t.psiType] })]
);

// Maps a raw, folder-derived location name (e.g. "13. FT Malang", "AFT El Tari")
// found while migrating the real archive to a curated `locations.name`. Left
// unresolved (`canonicalLocation` null) for the ~30 real terminals that have no
// curated counterpart yet — that's expected, not an error (see migrate.ts).
export const locationAliases = pgTable("location_aliases", {
  rawPattern: text("raw_pattern").primaryKey(),
  canonicalLocation: text("canonical_location").references(() => locations.name),
});

// ---------------------------------------------------------------------------
// Users & sessions
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  // NULL = self-registered account pending Admin Regional onboarding — mirrors
  // SimulatedUser.location's nullable meaning from the client-only prototype.
  location: text("location").references(() => locations.name),
  isRegionalAdmin: boolean("is_regional_admin").notNull().default(false),
  // Self-selected at registration, before any Admin Regional approval. Stored so the
  // admin's activation screen can prefill these as the suggested role/location instead
  // of defaulting every pending account to "Initiator / first terminal". They are
  // ONLY ever defaults — the account is still created with role='Penanggung Jawab PSI
  // (Initiator)' and location=NULL, so nothing is granted until an admin approves.
  requestedRole: text("requested_role"),
  requestedLocation: text("requested_location").references(() => locations.name),
  // Peran MOC (Reviewer/Approver/Performer) + fungsi yang DIAJUKAN user saat melengkapi
  // profil. Sama seperti requested_role: hanya usulan yang diisikan otomatis di layar
  // aktivasi Admin Regional, tidak pernah memberi akses sendiri.
  requestedMocRoles: jsonb("requested_moc_roles").notNull().default(sql`'[]'::jsonb`),
  requestedMocFunction: text("requested_moc_function"),
  // Peran MOC per akun (TKO B13.3-07): subset dari Reviewer/Approver/Performer + fungsi
  // (mis. "Maintenance Service", "HSSE", "Terminal Manager"). Initiator & Controller tetap
  // lewat `role`. Dropdown pemilihan Reviewer/Approver/Performer hanya menampilkan akun
  // yang punya peran yang sesuai; server memvalidasi ulang.
  mocRoles: jsonb("moc_roles").notNull().default(sql`'[]'::jsonb`),
  mocFunction: text("moc_function"),
  // Nama pengguna alternatif untuk masuk (selain email). Nullable: akun lama diisi dari
  // bagian depan email lewat migrasi 0007; unik tanpa membedakan huruf besar/kecil.
  username: text("username"),
  // Verifikasi email: NULL = belum terverifikasi. Akun sebelum fitur ini ada diisi created_at oleh migrasi 0011;
  // akun dari login Google langsung terisi (penyedia identitas sudah memverifikasi).
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  // Autentikasi dua faktor (TOTP/aplikasi authenticator). Rahasia disimpan TERENKRIPSI (AES-256-GCM, lihat
  // lib/auth/secretBox.ts); kode pemulihan hanya hash-nya. TIDAK PERNAH dikirim ke klien.
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  mfaSecretEnc: text("mfa_secret_enc"),
  mfaEnabledAt: timestamp("mfa_enabled_at", { withTimezone: true }),
  mfaRecoveryHashes: jsonb("mfa_recovery_hashes").notNull().default(sql`'[]'::jsonb`),
  // Langkah waktu (30 dtk) TOTP terakhir yang dipakai — mencegah kode yang sama dipakai dua kali (replay).
  mfaLastStep: bigint("mfa_last_step", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("users_username_lower_idx").on(sql`lower(${t.username})`)]);

// Opaque-token sessions, not stateless JWT: assignUserAccess() needs a role/location
// change to take effect on the affected user's very next request (already a real
// requirement in the client-only prototype's assignUserAccess). Only the sha256 of
// the raw token is stored — the raw token lives solely in the httpOnly cookie.
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

// Password reset tokens — one-time, short-lived, sent by email. Only sha256(token) is
// ever persisted (same pattern as sessions.tokenHash); the raw token lives solely in
// the emailed link. `usedAt` makes a token single-use even before it expires.
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

// Token verifikasi email (hanya hash-nya disimpan; sekali pakai; kedaluwarsa).
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

// Tantangan MFA: dibuat setelah sandi benar tetapi SEBELUM sesi ada. Token acak jangka pendek (hanya hash
// disimpan) + hitungan percobaan; sesi baru dibuat setelah kode TOTP/pemulihan benar.
export const mfaChallenges = pgTable("mfa_challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// Failed/succeeded login attempts, keyed by the email that was tried — the login
// route counts recent failures per email before even checking the password, so a
// scripted brute-force against one account gets locked out regardless of how many
// different source IPs it comes from (IP alone is a weaker signal behind shared
// NAT/corporate networks, which this app's real users likely sit behind).
export const loginAttempts = pgTable("login_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  success: boolean("success").notNull(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Jejak audit: siapa melakukan apa, kapan, dari mana (login, perubahan akses, unduhan berkas, perubahan dokumen).
// Hanya DITAMBAH (tidak pernah diubah/dihapus aplikasi); pembacaan dibatasi Admin Regional (/admin/audit).
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    actorName: text("actor_name"),
    actorEmail: text("actor_email"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    targetLabel: text("target_label"),
    location: text("location"),
    ipAddress: text("ip_address"),
    detail: jsonb("detail"),
  },
  (t) => [index("audit_log_created_idx").on(t.createdAt), index("audit_log_action_idx").on(t.action)]
);

// ---------------------------------------------------------------------------
// File registry — every physical file, migrated or app-uploaded. No workflow
// semantics live here; `documents`/`historyItems` reference rows in this table.
// ---------------------------------------------------------------------------

export const fileRegistry = pgTable(
  "file_registry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    r2ObjectKey: text("r2_object_key").notNull().unique(),
    // Natural key for the migration script's idempotency check (see migrate.ts) —
    // stable across re-runs, unique per source file in "02. Process Safety/".
    originalRelativePath: text("original_relative_path").notNull().unique(),
    originalFilename: text("original_filename").notNull(),
    category: text("category").notNull(),
    locationRaw: text("location_raw"),
    locationCanonical: text("location_canonical").references(() => locations.name),
    pathSegments: jsonb("path_segments").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    mimeType: text("mime_type").notNull(),
    // Nullable: unknown until the bytes are actually hashed — the migration script
    // streams+hashes during upload, and app uploads only learn it once the browser's
    // PUT completes (see POST /api/files/[fileId]/confirm).
    checksumSha256: text("checksum_sha256"),
    uploadStatus: text("upload_status").notNull().default("pending"),
    needsLocationReview: boolean("needs_location_review").notNull().default(false),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("upload_status_check", sql`${t.uploadStatus} IN ('pending','uploaded','failed')`)]
);

// ---------------------------------------------------------------------------
// Curated workflow tables — 1:1 with the existing DocumentItem/HistoryItem/
// ApprovalRouteItem TS types from mockData.ts.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Sub-kategori dokumen Direktori (2026-09-28) — per lokasi, bukan enum tetap: client
// minta admin bisa membuat sub baru sendiri (lihat percakapan/memory
// project_directory_redesign_sub_categories), jadi ini tabel data, bukan union TS
// seperti PSIType. Diseed dengan 33 item Lampiran 3 PSI yang dikonfirmasi
// (project_psi_document_scope) untuk tiap lokasi; admin bisa tambah lagi per lokasi
// lewat tombol "+" di grid Direktori.
export const documentCategories = pgTable(
  "document_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    location: text("location").notNull().references(() => locations.name),
    name: text("name").notNull(),
    // Siklus tinjau ulang dalam bulan — 60 (5 tahun) untuk PSI pada umumnya, 24 (2
    // tahun) untuk OSCP sesuai catatan TKO. Data-driven (bukan dihardcode per nama
    // kategori) supaya kategori kustom bisa punya siklusnya sendiri kalau nanti perlu.
    reviewCycleMonths: integer("review_cycle_months").notNull().default(60),
    // OSCP: lewat siklus BUKAN "kedaluwarsa" seperti dokumen lain — cuma peringatan
    // "perlu ditinjau ulang" (permintaan client eksplisit, jangan disamakan dengan 🟡
    // biasa). true hanya untuk kategori itu di data seed.
    treatExpiryAsReviewOnly: boolean("treat_expiry_as_review_only").notNull().default(false),
    isCustom: boolean("is_custom").notNull().default(false),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("document_categories_location_name_idx").on(t.location, t.name)]
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentNumber: text("document_number").notNull().unique(),
    title: text("title").notNull(),
    psiType: text("psi_type").notNull(),
    lifecyclePhase: text("lifecycle_phase").notNull(),
    location: text("location").notNull().references(() => locations.name),
    // Sub-kategori Direktori (lihat documentCategories) — nullable: dokumen lama
    // (sebelum fitur ini) belum dipetakan, tampil sebagai "belum dikategorikan"
    // sampai ditautkan manual, tidak dihitung di grid status kategori mana pun.
    categoryId: uuid("category_id").references(() => documentCategories.id),
    currentVersion: text("current_version").notNull(),
    status: text("status").notNull(),
    issueDate: date("issue_date").notNull(),
    expiryDate: date("expiry_date").notNull(),
    // Replaces the old fileUrl string — always points at a real file_registry row,
    // whether migrated from the real archive or uploaded through the app.
    primaryFileId: uuid("primary_file_id").notNull().references(() => fileRegistry.id),
    isCircular: boolean("is_circular").notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    // Sampah (2026-10-09): "hapus" hanya mengisi kolom ini; dokumen + berkasnya baru dihapus permanen
    // setelah TRASH_RETENTION_DAYS (cron) atau lewat "Hapus permanen". NULL = dokumen aktif. Tanpa FK
    // ke users supaya penghapusan akun tidak terhalang oleh jejak ini.
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedById: uuid("deleted_by_id"),
    deletedByName: text("deleted_by_name"),
  },
  (t) => [
    check("lifecycle_phase_check", sql`${t.lifecyclePhase} IN ('Proyek','Operasi','Decommissioning')`),
    check("status_check", sql`${t.status} IN ('Draft','In Routing','Approved','Revision Required','Expired')`),
  ]
);

export const approvalRoutes = pgTable(
  "approval_routes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
    approverRole: text("approver_role").notNull(),
    approverName: text("approver_name").notNull(),
    approverUserId: uuid("approver_user_id").references(() => users.id),
    stepOrder: integer("step_order").notNull(),
    status: text("status").notNull(),
    actionDate: date("action_date"),
    comment: text("comment"),
  },
  (t) => [check("route_status_check", sql`${t.status} IN ('Pending','Approved','Rejected')`)]
);

export const historyItems = pgTable(
  "history_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    actorName: text("actor_name").notNull(),
    actorRole: text("actor_role").notNull(),
    location: text("location").notNull(),
    action: text("action").notNull(),
    notes: text("notes"),
    // Version snapshot — which physical file this history entry's "Unduh Berkas vX"
    // button should resolve to; not necessarily the document's current primaryFileId.
    fileId: uuid("file_id").notNull().references(() => fileRegistry.id),
    version: text("version").notNull(),
  },
  (t) => [
    check(
      "action_check",
      sql`${t.action} IN ('Created','Forwarded','Approved','Rejected','Extended Validity','Revised','Closed')`
    ),
  ]
);

export const historyDiffs = pgTable("history_diffs", {
  id: uuid("id").primaryKey().defaultRandom(),
  historyItemId: uuid("history_item_id").notNull().references(() => historyItems.id, { onDelete: "cascade" }),
  field: text("field").notNull(),
  oldValue: text("old_value").notNull(),
  newValue: text("new_value").notNull(),
});

// ---------------------------------------------------------------------------
// Management of Change (MOC) — entitas terpisah dari `documents` (PSI). Lihat
// domain/moc.ts untuk sumber nilai enum (TKO B13.3-07). Semua enum berupa CHECK
// pada kolom text, sama seperti tabel lain.
// ---------------------------------------------------------------------------
export const mocRequests = pgTable(
  "moc_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mocNumber: text("moc_number").unique(), // null sampai Controller meregistrasi
    location: text("location").notNull().references(() => locations.name),
    unitOperasi: text("unit_operasi").notNull().default(""),
    fungsi: text("fungsi").notNull().default(""),
    region: text("region").notNull().default("Jatimbalinus"),
    anggaranType: text("anggaran_type").notNull().default(""),
    tanggal: date("tanggal").notNull(),
    judul: text("judul").notNull().default(""),
    latarBelakang: text("latar_belakang").notNull().default(""),
    changeCategories: jsonb("change_categories").notNull().default(sql`'[]'::jsonb`),
    sifatPerubahan: text("sifat_perubahan").notNull().default("Permanen"),
    validFrom: date("valid_from"),
    validUntil: date("valid_until"),
    deskripsi: text("deskripsi").notNull().default(""),
    prosesTerdampak: text("proses_terdampak").notNull().default(""),
    peraturanRelevan: text("peraturan_relevan").notNull().default(""),
    stakeholderReviewer: text("stakeholder_reviewer").notNull().default(""),
    studiKajian: text("studi_kajian").notNull().default(""),
    usulanPerformer: text("usulan_performer").notNull().default(""),
    initiatorName: text("initiator_name").notNull().default(""),
    initiatorJabatan: text("initiator_jabatan").notNull().default(""),
    riskImpacts: jsonb("risk_impacts").notNull().default(sql`'[]'::jsonb`),
    hazardDescription: text("hazard_description").notNull().default(""),
    severity: integer("severity"),
    probability: integer("probability"),
    riskLevel: text("risk_level"),
    plantBarriers: jsonb("plant_barriers").notNull().default(sql`'[]'::jsonb`),
    processBarriers: jsonb("process_barriers").notNull().default(sql`'[]'::jsonb`),
    peopleBarriers: jsonb("people_barriers").notNull().default(sql`'[]'::jsonb`),
    upsideGain: text("upside_gain").notNull().default(""),
    downsideLoss: text("downside_loss").notNull().default(""),
    registerStatus: text("register_status").notNull().default("Inisiasi & Validasi"),
    validationState: text("validation_state").notNull().default("draft"),
    round: integer("round").notNull().default(1),
    approverUserId: uuid("approver_user_id").references(() => users.id),
    performerUserId: uuid("performer_user_id").references(() => users.id),
    performerName: text("performer_name"),
    // Pilihan reviewer/approver yang sedang disiapkan Initiator, disimpan di server agar
    // tidak hilang saat berpindah halaman / mengubah formulir.
    plannedReviewers: jsonb("planned_reviewers").notNull().default(sql`'[]'::jsonb`),
    plannedApproverId: uuid("planned_approver_id").references(() => users.id),
    // Approver tanpa akun: nama dan jabatan diketik manual (approverUserId kosong). Dipakai juga sebagai rencana saat draf.
    approverManualName: text("approver_manual_name"),
    approverManualJabatan: text("approver_manual_jabatan"),
    // Tahap F-H (Lampiran 6 dan 7): daftar catatan pemantauan, catatan tinjauan akhir, dan penutupan. NULL = belum ada.
    monitoring: jsonb("monitoring"),
    finalReview: jsonb("final_review"),
    closure: jsonb("closure"),
    // Tahap D Komunikasi & E.1 Rencana Implementasi (lihat domain/moc.ts). NULL = belum dicatat.
    communication: jsonb("communication"),
    implementationPlan: jsonb("implementation_plan"),
    approverNote: text("approver_note"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("moc_sifat_check", sql`${t.sifatPerubahan} IN ('Permanen','Sementara','Darurat')`),
    check("moc_risk_level_check", sql`${t.riskLevel} IS NULL OR ${t.riskLevel} IN ('L','LTM','M','MTH','H')`),
    check("moc_severity_check", sql`${t.severity} IS NULL OR (${t.severity} BETWEEN 1 AND 5)`),
    check("moc_probability_check", sql`${t.probability} IS NULL OR (${t.probability} BETWEEN 1 AND 5)`),
    check(
      "moc_register_status_check",
      sql`${t.registerStatus} IN ('Inisiasi & Validasi','Implementasi','Pemantauan','Tinjauan Akhir','Closed')`
    ),
    check(
      "moc_validation_state_check",
      sql`${t.validationState} IN ('draft','in_review','returned','pending_approval','rejected','approved','registered')`
    ),
  ]
);

export const mocReviews = pgTable(
  "moc_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mocId: uuid("moc_id").notNull().references(() => mocRequests.id, { onDelete: "cascade" }),
    round: integer("round").notNull(),
    functionLabel: text("function_label").notNull(),
    reviewerUserId: uuid("reviewer_user_id").references(() => users.id),
    reviewerName: text("reviewer_name").notNull(),
    reviewerJabatan: text("reviewer_jabatan").notNull().default(""),
    outcome: text("outcome").notNull().default("Pending"),
    recommendation: text("recommendation").notNull().default(""),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (t) => [check("moc_review_outcome_check", sql`${t.outcome} IN ('Pending','Sesuai','Perlu Perubahan')`)]
);

export const mocHistory = pgTable("moc_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  mocId: uuid("moc_id").notNull().references(() => mocRequests.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  actorName: text("actor_name").notNull(),
  actorRole: text("actor_role").notNull(),
  action: text("action").notNull(),
  notes: text("notes"),
  fromState: text("from_state"),
  toState: text("to_state"),
});

// Berkas bukti tanda tangan (diunggah balik setelah ditandatangani di luar web).
// PSI terdampak per MOC (Tahap 4): tautan ke dokumen Direktori. baselineVersion = versi saat ditandai, dipakai
// membandingkan apakah dokumen sudah diperbarui karena MOC ini.
export const mocAffectedDocs = pgTable(
  "moc_affected_docs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mocId: uuid("moc_id").notNull().references(() => mocRequests.id, { onDelete: "cascade" }),
    documentId: uuid("document_id").notNull().references(() => documents.id),
    baselineVersion: text("baseline_version").notNull(),
    addedBy: uuid("added_by").references(() => users.id),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("moc_affected_docs_unique").on(t.mocId, t.documentId), index("moc_affected_docs_document_idx").on(t.documentId)]
);

export const mocEvidence = pgTable(
  "moc_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mocId: uuid("moc_id").notNull().references(() => mocRequests.id, { onDelete: "cascade" }),
    slot: text("slot").notNull(),
    // Tahap Register saat lampiran diunggah (hanya untuk slot 'lampiran').
    stage: text("stage"),
    reviewId: uuid("review_id").references(() => mocReviews.id, { onDelete: "set null" }),
    fileId: uuid("file_id").notNull().references(() => fileRegistry.id),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("moc_evidence_slot_check", sql`${t.slot} IN ('initiator','reviewer','approver','controller','lampiran')`)]
);
