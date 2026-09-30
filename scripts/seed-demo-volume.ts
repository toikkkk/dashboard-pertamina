// Demo-volume seed: adds ~30 more curated documents on top of the 11 already seeded
// by seed-curated-documents.ts, so the dashboard has enough data to look real for a
// demo. Every row points at a REAL file_registry entry (never a fabricated URL), and
// every location is one of the 5 curated terminals — the same two invariants the
// original seed enforces.
//
// Reuses the same small already-uploaded files as primary_file_id so previews stay
// fast (see DocumentContentPreview's 8MB parse cap; large files only show the
// "download it" notice, which is correct but less impressive in a live demo). A few
// documents are deliberately OVERDUE (expiryDate in the past) so the Overdue/Dilemma
// and KPI "Kedaluwarsa" views have real content, not just the 2 pre-existing ones.
//
// Idempotent: skips any documentNumber that already exists. Run via:
//   pnpm seed:demo-volume
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "../src/lib/db/client";
import { fileRegistry, documents, approvalRoutes, historyItems } from "../src/lib/db/schema";

type PSIType =
  | "Informasi Bahan Berbahaya"
  | "Informasi Teknologi Proses"
  | "Informasi Peralatan"
  | "Sistem Tata Kerja";

interface SeedDoc {
  documentNumber: string;
  title: string;
  psiType: PSIType;
  location: string;
  status: "Draft" | "In Routing" | "Approved" | "Revision Required" | "Expired";
  issueDate: string;
  expiryDate: string;
  currentVersion: string;
  isCircular: boolean;
  fileKeyword: string; // substring matched against file_registry.original_filename
  actorName: string;
  actorRole: string;
  action: string;
  notes: string;
}

// Built by hand so the demo shows a realistic spread across all 5 terminals, all 4
// PSI types, and every status — including genuinely overdue rows.
const DEMO_DOCS: SeedDoc[] = [
  // ---- FT Malang ----
  { documentNumber: "PSI-MALANG-2020-004", title: "MSDS Solar Industri - T-101", psiType: "Informasi Bahan Berbahaya", location: "FT Malang", status: "Expired", issueDate: "2019-01-15", expiryDate: "2024-01-15", currentVersion: "1.0", isCircular: false, fileKeyword: "eca", actorName: "Budi Santosa", actorRole: "Initiator", action: "Created", notes: "Registrasi MSDS tangki solar T-101" },
  { documentNumber: "PSI-MALANG-2021-005", title: "SOP Penanggulangan Keadaan Darurat", psiType: "Sistem Tata Kerja", location: "FT Malang", status: "Expired", issueDate: "2016-06-01", expiryDate: "2021-06-01", currentVersion: "2.0", isCircular: true, fileKeyword: "eca", actorName: "Budi Santosa", actorRole: "Initiator", action: "Created", notes: "SOP tanggap darurat terminal" },
  { documentNumber: "PSI-MALANG-2023-006", title: "HIRADC Loading Unloading BBM", psiType: "Sistem Tata Kerja", location: "FT Malang", status: "Approved", issueDate: "2023-03-20", expiryDate: "2028-03-20", currentVersion: "1.0", isCircular: true, fileKeyword: "eca", actorName: "Agnes Wijaya", actorRole: "PSI Controller", action: "Approved", notes: "HIRADC aktivitas loading/unloading" },
  { documentNumber: "PSI-MALANG-2024-007", title: "Datasheet Pompa Transfer P-201", psiType: "Informasi Peralatan", location: "FT Malang", status: "Approved", issueDate: "2024-04-10", expiryDate: "2029-04-10", currentVersion: "1.0", isCircular: false, fileKeyword: "sece", actorName: "Budi Santosa", actorRole: "Initiator", action: "Created", notes: "Spesifikasi teknis pompa transfer" },
  { documentNumber: "PSI-MALANG-2024-008", title: "Analisa Risiko Operasional Penyaluran", psiType: "Informasi Teknologi Proses", location: "FT Malang", status: "In Routing", issueDate: "2024-08-01", expiryDate: "2029-08-01", currentVersion: "1.0", isCircular: true, fileKeyword: "sece", actorName: "Budi Santosa", actorRole: "Initiator", action: "Forwarded", notes: "Kajian risiko penyaluran BBM" },
  { documentNumber: "PSI-MALANG-2025-009", title: "Inspection Report Tangki T-102", psiType: "Informasi Peralatan", location: "FT Malang", status: "Revision Required", issueDate: "2025-01-05", expiryDate: "2030-01-05", currentVersion: "1.0", isCircular: true, fileKeyword: "sece", actorName: "Agnes Wijaya", actorRole: "PSI Controller", action: "Rejected", notes: "Perlu melampirkan hasil uji ketebalan dinding" },

  // ---- IT Surabaya ----
  { documentNumber: "PSI-SURABAYA-2018-004", title: "MSDS Avtur - Depot Surabaya", psiType: "Informasi Bahan Berbahaya", location: "IT Surabaya", status: "Expired", issueDate: "2013-09-01", expiryDate: "2018-09-01", currentVersion: "1.0", isCircular: false, fileKeyword: "hazid", actorName: "Hendrik Pratama", actorRole: "MOC Controller", action: "Created", notes: "MSDS avtur depot Surabaya" },
  { documentNumber: "PSI-SURABAYA-2019-005", title: "SOP Operasi Penerimaan Avtur", psiType: "Sistem Tata Kerja", location: "IT Surabaya", status: "Expired", issueDate: "2014-11-20", expiryDate: "2019-11-20", currentVersion: "2.0", isCircular: true, fileKeyword: "hazid", actorName: "Hendrik Pratama", actorRole: "MOC Controller", action: "Created", notes: "SOP penerimaan avtur" },
  { documentNumber: "PSI-SURABAYA-2023-006", title: "HIRADC Pemeriksaan Tangki Timbun", psiType: "Sistem Tata Kerja", location: "IT Surabaya", status: "Approved", issueDate: "2023-05-15", expiryDate: "2028-05-15", currentVersion: "1.0", isCircular: true, fileKeyword: "hazid", actorName: "Hendrik Pratama", actorRole: "MOC Controller", action: "Approved", notes: "HIRADC inspeksi tangki timbun" },
  { documentNumber: "PSI-SURABAYA-2024-007", title: "Datasheet Hydrant System", psiType: "Informasi Peralatan", location: "IT Surabaya", status: "Approved", issueDate: "2024-02-28", expiryDate: "2029-02-28", currentVersion: "1.0", isCircular: false, fileKeyword: "grounding", actorName: "Hendrik Pratama", actorRole: "MOC Controller", action: "Created", notes: "Spesifikasi sistem hydrant" },
  { documentNumber: "PSI-SURABAYA-2024-008", title: "Analisa Risiko Proses Filling Shed", psiType: "Informasi Teknologi Proses", location: "IT Surabaya", status: "In Routing", issueDate: "2024-09-10", expiryDate: "2029-09-10", currentVersion: "1.0", isCircular: true, fileKeyword: "overfill", actorName: "Hendrik Pratama", actorRole: "MOC Controller", action: "Forwarded", notes: "Kajian risiko filling shed" },
  { documentNumber: "PSI-SURABAYA-2025-009", title: "PSV / Relief Valve Calc - T-03", psiType: "Informasi Teknologi Proses", location: "IT Surabaya", status: "Revision Required", issueDate: "2025-02-14", expiryDate: "2030-02-14", currentVersion: "1.0", isCircular: true, fileKeyword: "overfill", actorName: "Hendrik Pratama", actorRole: "MOC Controller", action: "Rejected", notes: "Perhitungan kapasitas PSV perlu divalidasi ulang" },

  // ---- IT Bima ----
  { documentNumber: "PSI-BIMA-2020-002", title: "MSDS Premium - Tangki Bima", psiType: "Informasi Bahan Berbahaya", location: "IT Bima", status: "Expired", issueDate: "2015-03-01", expiryDate: "2020-03-01", currentVersion: "1.0", isCircular: false, fileKeyword: "sece", actorName: "Made Wirawan", actorRole: "Initiator", action: "Created", notes: "MSDS premium tangki Bima" },
  { documentNumber: "PSI-BIMA-2023-003", title: "HIRADC Bongkar Muat Kapal", psiType: "Sistem Tata Kerja", location: "IT Bima", status: "Approved", issueDate: "2023-07-18", expiryDate: "2028-07-18", currentVersion: "1.0", isCircular: true, fileKeyword: "sece", actorName: "Made Wirawan", actorRole: "Initiator", action: "Approved", notes: "HIRADC bongkar muat kapal tanker" },
  { documentNumber: "PSI-BIMA-2024-004", title: "Inspection Report Dermaga - Jetty 1", psiType: "Informasi Peralatan", location: "IT Bima", status: "Approved", issueDate: "2024-05-22", expiryDate: "2029-05-22", currentVersion: "1.0", isCircular: false, fileKeyword: "sece", actorName: "Made Wirawan", actorRole: "Initiator", action: "Created", notes: "Inspeksi fasilitas dermaga jetty 1" },
  { documentNumber: "PSI-BIMA-2024-005", title: "Analisa Risiko Operasional Dermaga", psiType: "Informasi Teknologi Proses", location: "IT Bima", status: "In Routing", issueDate: "2024-10-05", expiryDate: "2029-10-05", currentVersion: "1.0", isCircular: true, fileKeyword: "sece", actorName: "Made Wirawan", actorRole: "Initiator", action: "Forwarded", notes: "Kajian risiko operasional dermaga" },

  // ---- AFT Eltari ----
  { documentNumber: "PSI-ELTARI-2019-003", title: "MSDS Avtur - AFT Eltari", psiType: "Informasi Bahan Berbahaya", location: "AFT Eltari", status: "Expired", issueDate: "2014-02-01", expiryDate: "2019-02-01", currentVersion: "1.0", isCircular: false, fileKeyword: "bundwall", actorName: "Yohanes Bureni", actorRole: "PSI Controller", action: "Created", notes: "MSDS avtur AFT Eltari" },
  { documentNumber: "PSI-ELTARI-2022-004", title: "SOP Pengisian Avtur Pesawat", psiType: "Sistem Tata Kerja", location: "AFT Eltari", status: "Approved", issueDate: "2022-08-12", expiryDate: "2027-08-12", currentVersion: "2.0", isCircular: true, fileKeyword: "bundwall", actorName: "Yohanes Bureni", actorRole: "PSI Controller", action: "Approved", notes: "SOP pengisian avtur pesawat" },
  { documentNumber: "PSI-ELTARI-2023-005", title: "HIRADC Operasional Hydrant Dispenser", psiType: "Sistem Tata Kerja", location: "AFT Eltari", status: "Approved", issueDate: "2023-04-25", expiryDate: "2028-04-25", currentVersion: "1.0", isCircular: true, fileKeyword: "fire risk", actorName: "Yohanes Bureni", actorRole: "PSI Controller", action: "Approved", notes: "HIRADC hydrant dispenser" },
  { documentNumber: "PSI-ELTARI-2024-006", title: "Inspection Report Fire Extinguisher", psiType: "Informasi Peralatan", location: "AFT Eltari", status: "Revision Required", issueDate: "2024-03-30", expiryDate: "2029-03-30", currentVersion: "1.0", isCircular: true, fileKeyword: "fire risk", actorName: "Yohanes Bureni", actorRole: "PSI Controller", action: "Rejected", notes: "Lengkapi data APAR per lokasi" },
  { documentNumber: "PSI-ELTARI-2024-007", title: "Analisa Risiko Sistem Perpipaan Avtur", psiType: "Informasi Teknologi Proses", location: "AFT Eltari", status: "In Routing", issueDate: "2024-11-08", expiryDate: "2029-11-08", currentVersion: "1.0", isCircular: true, fileKeyword: "bundwall", actorName: "Yohanes Bureni", actorRole: "PSI Controller", action: "Forwarded", notes: "Kajian risiko perpipaan avtur" },

  // ---- FT Madiun ----
  { documentNumber: "PSI-MADIUN-2018-004", title: "MSDS Bensin - Tangki Madiun", psiType: "Informasi Bahan Berbahaya", location: "FT Madiun", status: "Expired", issueDate: "2013-12-01", expiryDate: "2018-12-01", currentVersion: "1.0", isCircular: false, fileKeyword: "Control PS", actorName: "Siti Rahayu", actorRole: "Initiator", action: "Created", notes: "MSDS bensin tangki Madiun" },
  { documentNumber: "PSI-MADIUN-2022-005", title: "HIRADC Penimbunan BBM", psiType: "Sistem Tata Kerja", location: "FT Madiun", status: "Approved", issueDate: "2022-09-15", expiryDate: "2027-09-15", currentVersion: "1.0", isCircular: true, fileKeyword: "Control PS", actorName: "Siti Rahayu", actorRole: "Initiator", action: "Approved", notes: "HIRADC penimbunan BBM" },
  { documentNumber: "PSI-MADIUN-2023-006", title: "Datasheet Sistem Pemadam Kebakaran", psiType: "Informasi Peralatan", location: "FT Madiun", status: "Approved", issueDate: "2023-06-20", expiryDate: "2028-06-20", currentVersion: "1.0", isCircular: false, fileKeyword: "penangkal", actorName: "Siti Rahayu", actorRole: "Initiator", action: "Created", notes: "Spesifikasi sistem pemadam kebakaran" },
  { documentNumber: "PSI-MADIUN-2024-007", title: "Analisa Risiko Overhaul Tangki T-05", psiType: "Informasi Teknologi Proses", location: "FT Madiun", status: "In Routing", issueDate: "2024-12-01", expiryDate: "2029-12-01", currentVersion: "1.0", isCircular: true, fileKeyword: "Control PS", actorName: "Siti Rahayu", actorRole: "Initiator", action: "Forwarded", notes: "Kajian risiko overhaul tangki T-05" },
];

// Approver by terminal, matching the roles the seeded demo users already carry, so
// circular documents get a realistic pending/approved route set.
const APPROVERS: Record<string, { role: string; name: string }> = {
  "FT Malang": { role: "PSI Controller", name: "Agnes Wijaya" },
  "IT Surabaya": { role: "MOC Controller", name: "Hendrik Pratama" },
  "IT Bima": { role: "PSI / MOC Controller", name: "Made Wirawan" },
  "AFT Eltari": { role: "PSI Controller", name: "Yohanes Bureni" },
  "FT Madiun": { role: "PSI Controller", name: "Siti Rahayu" },
};

async function pickFile(keyword: string) {
  const [row] = await db
    .select()
    .from(fileRegistry)
    .where(sql`${fileRegistry.originalFilename} ILIKE ${"%" + keyword + "%"} AND ${fileRegistry.uploadStatus} = 'uploaded'`)
    .limit(1);
  return row ?? null;
}

async function main() {
  console.log("Seeding demo-volume documents...\n");

  let created = 0;
  let skipped = 0;

  for (const d of DEMO_DOCS) {
    const [existing] = await db.select({ id: documents.id }).from(documents).where(eq(documents.documentNumber, d.documentNumber)).limit(1);
    if (existing) {
      skipped++;
      continue;
    }

    const file = await pickFile(d.fileKeyword);
    if (!file) {
      console.warn(`  Skipping "${d.documentNumber}" — no uploaded file matching "${d.fileKeyword}".`);
      skipped++;
      continue;
    }

    const [createdDoc] = await db
      .insert(documents)
      .values({
        documentNumber: d.documentNumber,
        title: d.title,
        psiType: d.psiType,
        lifecyclePhase: "Operasi",
        location: d.location,
        currentVersion: d.currentVersion,
        status: d.status,
        issueDate: d.issueDate,
        expiryDate: d.expiryDate,
        primaryFileId: file.id,
        isCircular: d.isCircular,
      })
      .returning();

    if (d.isCircular) {
      const approver = APPROVERS[d.location];
      const routeStatus = d.status === "In Routing" ? "Pending" : d.status === "Revision Required" ? "Rejected" : "Approved";
      await db.insert(approvalRoutes).values({
        documentId: createdDoc.id,
        approverRole: approver.role,
        approverName: approver.name,
        stepOrder: 1,
        status: routeStatus,
        actionDate: d.status === "In Routing" ? null : d.issueDate,
        comment: d.status === "Revision Required" ? d.notes : null,
      });
    }

    await db.insert(historyItems).values({
      documentId: createdDoc.id,
      timestamp: new Date(`${d.issueDate}T08:00:00`),
      actorName: d.actorName,
      actorRole: d.actorRole,
      location: d.location,
      action: d.action,
      notes: d.notes,
      fileId: file.id,
      version: d.currentVersion,
    });

    created++;
  }

  console.log(`\nSeeded ${created} demo documents. Skipped ${skipped} (already present or no matching file).`);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
