// One-time migration of "02. Process Safety/" (~2,980 real files, 9.2GB) into R2 +
// file_registry. Standalone script — never imported by the Next.js app, never runs
// on Vercel, only locally against MIGRATION_SOURCE_ROOT (see .env.example).
//
// Usage:
//   pnpm migrate:dry-run          # walk the real tree, no R2/DB calls at all —
//                                  # safe to run right now, before real credentials
//                                  # exist, to validate the walker/key/location logic
//   pnpm migrate:files            # the real run (needs DATABASE_URL + R2_* env vars)
//   pnpm migrate:files -- --retry-failed   # re-attempt only rows marked 'failed'
//
// Idempotency: the R2 key is derived from sha256(relativePath) BEFORE any DB/network
// call (see lib/r2/keys.ts), so re-running the whole script from scratch is always
// safe — already-`uploaded` rows are skipped, `pending`/`failed` rows are retried.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); // matches this project's env-file convention (see .env.example)
import { readdir, stat } from "fs/promises";
import { createReadStream } from "fs";
import { createHash } from "crypto";
import path from "path";
import mime from "mime-types";
import pLimit from "p-limit";

const DRY_RUN = process.argv.includes("--dry-run");
const RETRY_FAILED = process.argv.includes("--retry-failed");
const CONCURRENCY = 6;

const SOURCE_ROOT = process.env.MIGRATION_SOURCE_ROOT;
if (!SOURCE_ROOT) {
  console.error("MIGRATION_SOURCE_ROOT is not set (see .env.example). Aborting.");
  process.exit(1);
}

// Real top-level folder names confirmed via a fresh directory scan this session —
// anything else found at the top level (there's one known stray file) falls back
// to 'uncategorized' rather than crashing the walk.
const CATEGORY_SLUGS: Record<string, string> = {
  "00. PSI": "00-psi",
  "01. Downgrade Situation": "01-downgrade-situation",
  "02. PHA": "02-pha",
  "03. LPS": "03-lps",
  "04. MAH - SECE": "04-mah-sece",
  "05. MOC": "05-moc",
  "07. FGDS": "07-fgds",
  "08. QRA": "08-qra",
  "10. Audit PSAIMS": "10-audit-psaims",
};

function categoryFor(topLevelSegment: string | undefined): string {
  if (!topLevelSegment) return "uncategorized";
  return CATEGORY_SLUGS[topLevelSegment] ?? "uncategorized";
}

// Generic location-folder heuristic — deliberately NOT a rigid per-category segment
// index, since nesting depth genuinely differs across the 9 categories (confirmed:
// "00. PSI/FT Malang/..." puts location at segment 1, "02. PHA/Evidence/13. FT
// Malang/..." at segment 2 with a numeric prefix to strip, etc.). Scans every
// segment for one that looks like a terminal name; the first match wins. Anything
// that matches nothing is flagged for manual review rather than silently mis-tagged
// — see the dry-run stats output below.
const LOCATION_PATTERN = /^(FT|IT|AFT)\s+.+/i;
const KNOWN_NON_PATTERN_LOCATIONS = ["Bitumen Plant Gresik"];

function stripNumericPrefix(segment: string): string {
  return segment.replace(/^\d+\.\s*/, "").trim();
}

function locationFor(segments: string[]): { raw: string | null; needsReview: boolean } {
  for (const seg of segments) {
    const stripped = stripNumericPrefix(seg);
    if (LOCATION_PATTERN.test(stripped) || KNOWN_NON_PATTERN_LOCATIONS.includes(stripped)) {
      return { raw: stripped, needsReview: false };
    }
  }
  return { raw: null, needsReview: true };
}

interface WalkedFile {
  absolutePath: string;
  relativePath: string; // posix-normalized, relative to SOURCE_ROOT
  filename: string;
  category: string;
  locationRaw: string | null;
  needsLocationReview: boolean;
  pathSegments: string[];
  sizeBytes: number;
  mimeType: string;
}

async function walk(dir: string, root: string, acc: WalkedFile[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(absolutePath, root, acc);
      continue;
    }
    if (!entry.isFile()) continue;

    const relativePath = path.relative(root, absolutePath).split(path.sep).join("/");
    const segments = relativePath.split("/");
    const filename = segments[segments.length - 1];
    const dirSegments = segments.slice(0, -1);
    const category = categoryFor(dirSegments[0]);
    const { raw, needsReview } = locationFor(dirSegments);
    const st = await stat(absolutePath);

    acc.push({
      absolutePath,
      relativePath,
      filename,
      category,
      locationRaw: raw,
      needsLocationReview: needsReview,
      pathSegments: dirSegments,
      sizeBytes: st.size,
      mimeType: mime.lookup(filename) || "application/octet-stream",
    });
  }
}

function formatBytes(n: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)}${units[i]}`;
}

async function runDryRun(files: WalkedFile[]) {
  const byCategory: Record<string, number> = {};
  let needsReviewCount = 0;
  let totalBytes = 0;

  for (const f of files) {
    byCategory[f.category] = (byCategory[f.category] ?? 0) + 1;
    if (f.needsLocationReview) needsReviewCount++;
    totalBytes += f.sizeBytes;
  }

  console.log(`\n=== DRY RUN — ${files.length} files, ${formatBytes(totalBytes)} total ===\n`);
  console.log("By category:");
  for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(24)} ${count}`);
  }
  console.log(`\nNeeds location review: ${needsReviewCount} (${((needsReviewCount / files.length) * 100).toFixed(1)}%)`);

  const sampleReview = files.filter((f) => f.needsLocationReview).slice(0, 10);
  if (sampleReview.length) {
    console.log("\nSample files needing location review:");
    for (const f of sampleReview) console.log(`  ${f.relativePath}`);
  }

  const keys = new Set<string>();
  let collisions = 0;
  for (const f of files) {
    const { registryObjectKey } = await import("../src/lib/r2/keys");
    const key = registryObjectKey(f.category, f.relativePath, f.filename);
    if (keys.has(key)) collisions++;
    keys.add(key);
  }
  console.log(`\nR2 key collisions: ${collisions} (should always be 0)`);
  console.log("\nDry run complete — no R2 or database calls were made.\n");
}

async function runRealMigration(files: WalkedFile[]) {
  // Deferred imports: these touch env vars that don't need to exist for --dry-run.
  const { db } = await import("../src/lib/db/client");
  const { fileRegistry } = await import("../src/lib/db/schema");
  const { eq } = await import("drizzle-orm");
  const { r2, R2_BUCKET } = await import("../src/lib/r2/client");
  const { registryObjectKey } = await import("../src/lib/r2/keys");
  const { Upload } = await import("@aws-sdk/lib-storage");
  const fsErrors: string[] = [];

  const limit = pLimit(CONCURRENCY);
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  await Promise.all(
    files.map((f) =>
      limit(async () => {
        try {
          const key = registryObjectKey(f.category, f.relativePath, f.filename);

          const [existing] = await db
            .select()
            .from(fileRegistry)
            .where(eq(fileRegistry.originalRelativePath, f.relativePath))
            .limit(1);

          if (existing?.uploadStatus === "uploaded") {
            skipped++;
            return;
          }
          if (RETRY_FAILED && existing && existing.uploadStatus !== "failed") {
            skipped++;
            return;
          }

          if (!existing) {
            await db.insert(fileRegistry).values({
              r2ObjectKey: key,
              originalRelativePath: f.relativePath,
              originalFilename: f.filename,
              category: f.category,
              locationRaw: f.locationRaw,
              pathSegments: f.pathSegments,
              sizeBytes: f.sizeBytes,
              mimeType: f.mimeType,
              needsLocationReview: f.needsLocationReview,
              uploadStatus: "pending",
            });
          }

          const hash = createHash("sha256");
          const stream = createReadStream(f.absolutePath);
          stream.on("data", (chunk) => hash.update(chunk));

          const upload = new Upload({
            client: r2,
            params: { Bucket: R2_BUCKET, Key: key, Body: stream, ContentType: f.mimeType },
          });
          await upload.done();

          await db
            .update(fileRegistry)
            .set({
              uploadStatus: "uploaded",
              checksumSha256: hash.digest("hex"),
              uploadedAt: new Date(),
            })
            .where(eq(fileRegistry.originalRelativePath, f.relativePath));

          uploaded++;
          if (uploaded % 100 === 0) console.log(`  ...${uploaded} uploaded so far`);
        } catch (err) {
          failed++;
          const message = err instanceof Error ? err.message : String(err);
          fsErrors.push(`${f.relativePath}: ${message}`);
          await db
            .update(fileRegistry)
            .set({ uploadStatus: "failed" })
            .where(eq(fileRegistry.originalRelativePath, f.relativePath))
            .catch(() => {});
        }
      })
    )
  );

  console.log(`\n=== MIGRATION COMPLETE ===`);
  console.log(`Uploaded: ${uploaded}, Skipped (already done): ${skipped}, Failed: ${failed}`);

  if (fsErrors.length) {
    const { writeFile } = await import("fs/promises");
    await writeFile("migration-errors.log", fsErrors.join("\n"), "utf-8");
    console.log(`See migration-errors.log for ${fsErrors.length} failure(s). Re-run with --retry-failed.`);
  }
}

async function main() {
  console.log(`Walking ${SOURCE_ROOT} ...`);
  const files: WalkedFile[] = [];
  await walk(SOURCE_ROOT!, SOURCE_ROOT!, files);
  console.log(`Found ${files.length} files.`);

  if (DRY_RUN) {
    await runDryRun(files);
  } else {
    await runRealMigration(files);
  }
}

main().catch((err) => {
  console.error("Migration script failed:", err);
  process.exit(1);
});
