// R2 object key conventions — shared between the migration script (scripts/migrate.ts)
// and the app's own upload flow (POST /api/files/presign-upload), so there is exactly
// one place that decides what a key looks like.
import { createHash } from "crypto";

export function sanitizeFilename(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const ext = dot > -1 ? filename.slice(dot) : "";
  const base = dot > -1 ? filename.slice(0, dot) : filename;
  const cleanBase = base
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 150);
  const cleanExt = ext.replace(/[^A-Za-z0-9.]+/g, "").toLowerCase();
  return `${cleanBase || "file"}${cleanExt}`;
}

// Deterministic from the full relative path (not just filename) — guarantees
// uniqueness across the many duplicate filenames in the real archive (e.g. many
// "HAZID 6.pdf"s in different folders) and lets migrate.ts recompute the exact same
// key on every re-run without needing the DB row to already exist (see its
// idempotency design).
export function registryObjectKey(categorySlug: string, originalRelativePath: string, originalFilename: string): string {
  const hash = createHash("sha256").update(originalRelativePath).digest("hex").slice(0, 16);
  return `registry/${categorySlug}/${hash}-${sanitizeFilename(originalFilename)}`;
}

// Files that originate from the app itself (new uploads, revisions) — collision
// isn't a concern since documentId+version already disambiguates, so a more
// human-readable key is used instead of a path hash.
export function documentObjectKey(documentId: string, version: string, originalFilename: string): string {
  return `documents/${documentId}/${version}/${sanitizeFilename(originalFilename)}`;
}
