// Drizzle schema for Neon Postgres. See CLAUDE.md ("Backend / database") for the
// two-tier data model this implements: `fileRegistry` is every physical migrated
// file (no workflow semantics), `documents`/`approvalRoutes`/`historyItems` are the
// curated workflow objects — each references fileRegistry by id instead of holding
// a raw fileUrl string. Column names use snake_case to match plain-SQL conventions;
// Drizzle maps them to camelCase JS property names automatically.

import { pgTable, text, uuid, integer, boolean, timestamp, date, bigint, jsonb, primaryKey, check } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

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

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentNumber: text("document_number").notNull().unique(),
    title: text("title").notNull(),
    psiType: text("psi_type").notNull(),
    auditType: text("audit_type"),
    lifecyclePhase: text("lifecycle_phase").notNull(),
    location: text("location").notNull().references(() => locations.name),
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
