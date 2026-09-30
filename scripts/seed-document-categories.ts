// Seeds the 33 confirmed PSI document sub-categories (Lampiran 3 TKO B6.2-08, subset
// confirmed with the client 2026-09-28 — see memory project_psi_document_scope / this
// session's conversation) for every location. Idempotent (ON CONFLICT on the
// (location, name) unique index) — safe to re-run. Run: pnpm tsx scripts/seed-document-categories.ts
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { db } from "../src/lib/db/client";
import { documentCategories, locations } from "../src/lib/db/schema";
import { sql } from "drizzle-orm";

// 18 dengan Link nyata di file PSI First Column + 15 "kosongin dulu" (dikonfirmasi
// tetap masuk cakupan) = 33. OSCP dapat siklus 2 tahun + peringatan-saja (bukan
// kedaluwarsa keras) sesuai keputusan client.
const DEFAULT_CATEGORIES: { name: string; reviewCycleMonths?: number; treatExpiryAsReviewOnly?: boolean }[] = [
  { name: "SDS Produk BBM/BBK/LPG" },
  { name: "PFD (Process Flow Diagram)" },
  { name: "P&ID" },
  { name: "Cause & Effect / SAFE Chart" },
  { name: "Fire and Gas Detection Layout" },
  { name: "Perhitungan Bundwall" },
  { name: "Lightning & Surge Protection Study (LPS)" },
  { name: "Electrical Equipment List" },
  { name: "Studi Sistem Pentanahan (Grounding)" },
  { name: "HAC Layout" },
  { name: "HAC Schedule" },
  { name: "MAH Study & Register" },
  { name: "SECE Study & Register" },
  { name: "Bow Tie" },
  { name: "QRA (Quantitative Risk Assessment)" },
  { name: "Incident Risk Card" },
  { name: "OSCP (Oil Spill Contingency Planning)", reviewCycleMonths: 24, treatExpiryAsReviewOnly: true },
  { name: "Dokumen Lingkungan (AMDAL/UKL-UPL/DELH/DPLH)" },
  { name: "Design Basis" },
  { name: "Operation & Control Philosophy" },
  { name: "Heat and Material Balance" },
  { name: "Equipment Sizing Calculation" },
  { name: "Single Line Diagram (SLD)" },
  { name: "Wiring and Connection Diagram" },
  { name: "Instrument Data Sheet" },
  { name: "Safe Operating Limit / Envelope (SOL/SOE)" },
  { name: "Operating Manual & Daftar Alarm/Interlock" },
  { name: "Prosedur Startup & Shutdown" },
  { name: "Prosedur Penanganan Abnormal & Darurat" },
  { name: "FERA (Fire and Explosion Risk Assessment)" },
  { name: "Fire Risk Card" },
  { name: "Pre-Fire Planning" },
  { name: "Emergency Response Plan" },
];

async function main() {
  const locs = await db.select({ name: locations.name }).from(locations);
  console.log(`Seeding ${DEFAULT_CATEGORIES.length} default categories x ${locs.length} locations...`);

  let inserted = 0;
  for (const loc of locs) {
    for (const cat of DEFAULT_CATEGORIES) {
      const res = await db
        .insert(documentCategories)
        .values({
          location: loc.name,
          name: cat.name,
          reviewCycleMonths: cat.reviewCycleMonths ?? 60,
          treatExpiryAsReviewOnly: cat.treatExpiryAsReviewOnly ?? false,
          isCustom: false,
        })
        .onConflictDoNothing({ target: [documentCategories.location, documentCategories.name] })
        .returning({ id: documentCategories.id });
      if (res.length > 0) inserted++;
    }
  }
  console.log(`Done. Inserted ${inserted} new rows (existing ones skipped).`);

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(documentCategories);
  console.log(`document_categories total rows: ${count}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
