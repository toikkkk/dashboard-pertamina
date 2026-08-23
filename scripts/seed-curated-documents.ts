// Second migration pass (run AFTER migrate.ts has populated file_registry) — seeds
// locations/location_targets/users from mockData.ts's REGIONAL_LOCATIONS/
// SIMULATED_USERS, then seeds the curated documents/approval_routes/history_items
// from INITIAL_DOCUMENTS, resolving each one's real file via SAMPLE_DOC_SOURCE_PATHS
// below. This is what supersedes frontend/public/sample-docs/ — run this once, then
// delete that folder and the /sample-docs/... fileUrl strings in mockData.ts.
//
// Scope note: only the 11 INITIAL_DOCUMENTS entries that were deliberately backed by
// a real file this session (see CLAUDE.md's "real sample files" note) get seeded.
// The other 4 (SOP BBM, MSDS T-101, HIRADC Jatimbalinus, Early Warning System) have
// no real file behind them and are deliberately left out — documents.primary_file_id
// is NOT NULL by design (every curated document points at a real file_registry row),
// and fabricating a placeholder file for them would just be the old
// "https://r2.cloudflare-pertamina.com/..." fakery relocated into real Postgres.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { locations, locationTargets, users, fileRegistry, documents, approvalRoutes, historyItems, historyDiffs } from "../src/lib/db/schema";
import { hashPassword } from "../src/lib/auth/password";
import { REGIONAL_LOCATIONS, SIMULATED_USERS, INITIAL_DOCUMENTS, deriveDemoEmail } from "../src/lib/mockData";

// sample-docs basename -> original path relative to MIGRATION_SOURCE_ROOT, exactly
// as hand-picked and copied into public/sample-docs/ earlier this session.
const SAMPLE_DOC_SOURCE_PATHS: Record<string, string> = {
  "eca-ft-malang.pdf": "00. PSI/FT Malang/8. PCE & CRITICALITY (ECA)/ECA FT MALANG/ECA-FT MALANG_SIGN.PDF",
  "sece-mah-2025-ft-bima.xlsx": "04. MAH - SECE/1. 2025 SECE MAH 2025 FT Bima.xlsx",
  "mah-sece-2025-aft-eltari.xlsx": "04. MAH - SECE/2025 MAH SECE AFT Eltari.xlsx",
  "control-ps-sece-form-ft-madiun.xlsx": "04. MAH - SECE/3. Control PS SECE form - FT Madiun.xlsx",
  "sece-ft-malang.xlsx": "02. PHA/P&ID, PFD, Layout/13. FT Malang/AIM - PTC - 2025/7. SECE/SECE-FT MALANG.xlsx",
  "hazid-overfill-it-surabaya.xlsx": "02. PHA/Evidence/3. IT Surabaya (Fuel)/HAZID/HAZID - 2 Emergency Drill/HAZID 2 - Perhitungan Overfill IT SURABAYA (Fix).xlsx",
  "tki-grounding-it-surabaya.pdf": "02. PHA/Evidence/3. IT Surabaya (Fuel)/HAZID/HAZID - 9 Grounding/TKI Pemeriksaan Grounding System IT Surabaya Signed.pdf",
  "fire-risk-card-tangki-01-aft-eltari.xlsx": "02. PHA/Evidence/23. AFT El Tari/HAZID/HAZID - 33 AFT ELTARI 1. Fire Risk Card Tangki 01.xlsx",
  "analisa-bundwall-aft-eltari.xlsx": "02. PHA/Evidence/23. AFT El Tari/HAZID/HAZID 6 - Perhitungan Bundwall/Analisa Perhitungan Bundwall AFT Eltari.xlsx",
  "sertifikat-penangkal-petir-ft-madiun.pdf": "02. PHA/Evidence/14. FT Madiun/HAZID/HAZID 2 Penangkal Petir/Sertifikat penangkal petir FT Madiun.pdf",
  "tindak-lanjut-psaims-it-surabaya.xlsm": "10. Audit PSAIMS/260526 Tindak Lanjut Rekomendasi PSAIMS_rev20May_Juanda.xlsm",
};

// Every built-in demo user gets this as their password in the seeded DB — fine for
// a one-month trial with known demo accounts; swap for real invitations before any
// wider rollout.
const DEMO_PASSWORD = "Demo12345!";

// Was previously just stripping the "/sample-docs/" prefix and using the flat
// basename (e.g. "eca-ft-malang.pdf") directly as the file_registry lookup key —
// but originalRelativePath rows from migrate.ts are the real nested archive paths
// (e.g. "00. PSI/FT Malang/8. PCE & CRITICALITY (ECA)/.../ECA-FT MALANG_SIGN.PDF"),
// so every lookup silently missed. SAMPLE_DOC_SOURCE_PATHS existed for exactly this
// translation but was never actually consulted — only caught now that a real
// migration exists to test this path against.
function resolveSampleFileUrl(fileUrl: string): string | null {
  if (!fileUrl.startsWith("/sample-docs/")) return null;
  const basename = fileUrl.replace("/sample-docs/", "");
  return SAMPLE_DOC_SOURCE_PATHS[basename] ?? null;
}

async function seedLocations() {
  for (const loc of REGIONAL_LOCATIONS) {
    await db.insert(locations).values({ name: loc.locationName, locationType: loc.locationType, region: loc.region }).onConflictDoNothing();
    for (const [psiType, target] of Object.entries(loc.targets)) {
      await db
        .insert(locationTargets)
        .values({ locationName: loc.locationName, psiType, target })
        .onConflictDoNothing();
    }
  }
  console.log(`Seeded ${REGIONAL_LOCATIONS.length} locations.`);
}

async function seedUsers(): Promise<Map<string, string>> {
  const nameToId = new Map<string, string>();
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  for (const u of SIMULATED_USERS) {
    const email = deriveDemoEmail(u.name);
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      nameToId.set(u.name, existing.id);
      continue;
    }
    const [created] = await db
      .insert(users)
      .values({
        name: u.name,
        email,
        passwordHash,
        role: u.role,
        location: u.isRegionalAdmin ? null : u.location, // admin's "Semua Lokasi" isn't a real locations row
        isRegionalAdmin: u.isRegionalAdmin ?? false,
      })
      .returning();
    nameToId.set(u.name, created.id);
  }
  console.log(`Seeded ${SIMULATED_USERS.length} demo users (password for all: ${DEMO_PASSWORD}).`);
  return nameToId;
}

async function seedDocuments(userIdByName: Map<string, string>) {
  let seeded = 0;
  let skippedNoFile = 0;

  for (const doc of INITIAL_DOCUMENTS) {
    const sourcePath = resolveSampleFileUrl(doc.fileUrl);
    if (!sourcePath) {
      skippedNoFile++;
      continue;
    }

    const [file] = await db.select().from(fileRegistry).where(eq(fileRegistry.originalRelativePath, sourcePath)).limit(1);
    if (!file || file.uploadStatus !== "uploaded") {
      console.warn(`  Skipping "${doc.title}" — source file not found in file_registry yet (did migrate.ts run?): ${sourcePath}`);
      skippedNoFile++;
      continue;
    }

    const [existing] = await db.select({ id: documents.id }).from(documents).where(eq(documents.documentNumber, doc.documentNumber)).limit(1);
    if (existing) continue;

    const [created] = await db
      .insert(documents)
      .values({
        documentNumber: doc.documentNumber,
        title: doc.title,
        psiType: doc.psiType,
        auditType: doc.auditType,
        lifecyclePhase: doc.lifecyclePhase,
        location: doc.location,
        currentVersion: doc.currentVersion,
        status: doc.status,
        issueDate: doc.issueDate,
        expiryDate: doc.expiryDate,
        primaryFileId: file.id,
        isCircular: doc.isCircular,
        createdBy: userIdByName.get(doc.history[0]?.actorName) ?? null,
      })
      .returning();

    if (doc.routes.length > 0) {
      await db.insert(approvalRoutes).values(
        doc.routes.map((r) => ({
          documentId: created.id,
          approverRole: r.approverRole,
          approverName: r.approverName,
          approverUserId: userIdByName.get(r.approverName) ?? null,
          stepOrder: r.stepOrder,
          status: r.status,
          actionDate: r.actionDate,
          comment: r.comment,
        }))
      );
    }

    for (const h of doc.history) {
      const [historyRow] = await db
        .insert(historyItems)
        .values({
          documentId: created.id,
          timestamp: new Date(h.timestamp.replace(" ", "T")),
          actorUserId: userIdByName.get(h.actorName) ?? null,
          actorName: h.actorName,
          actorRole: h.actorRole,
          location: h.location,
          action: h.action,
          notes: h.notes,
          fileId: file.id, // all seed history points at the same single real file
          version: h.version,
        })
        .returning();

      if (h.diff?.length) {
        await db.insert(historyDiffs).values(
          h.diff.map((d) => ({ historyItemId: historyRow.id, field: d.field, oldValue: d.oldValue, newValue: d.newValue }))
        );
      }
    }

    seeded++;
  }

  console.log(`Seeded ${seeded} curated documents. Skipped ${skippedNoFile} (no real file backing them yet).`);
}

async function main() {
  console.log("Seeding curated demo data...\n");
  await seedLocations();
  const userIdByName = await seedUsers();
  await seedDocuments(userIdByName);
  console.log("\nDone. public/sample-docs/ and mockData.ts's /sample-docs/... fileUrl strings can now be retired.");
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
