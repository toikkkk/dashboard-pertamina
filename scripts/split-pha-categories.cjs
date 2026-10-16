// Memilah sub-dokumen "HAZID & HAZOP Study" menjadi "Report PHA" dan "Evidence PHA" di tiap lokasi
// (permintaan client 16 Okt 2026): kategori lama diganti NAMA menjadi "Report PHA" (id dan dokumennya tetap),
// kategori "Evidence PHA" dibuat, dan dokumen yang judulnya TIDAK memuat "Report"/"Laporan" dipindah ke sana.
// Evidence PHA tidak dihitung di visualisasi dashboard (lihat isEvidenceDoc di lib/domain/rules.ts).
//
//   node scripts/split-pha-categories.cjs                       -> simulasi (tidak menulis apa pun)
//   node scripts/split-pha-categories.cjs --apply <rollback.json> -> terapkan, simpan peta untuk pengembalian
//   node scripts/split-pha-categories.cjs --rollback <rollback.json> -> kembalikan semuanya
//
// Aman dijalankan ulang: yang sudah dipilah tidak diproses lagi. Riwayat dokumen memakai catatan
// "Pembaruan sub-kategori dokumen" (bukan pembaruan isi), sama seperti menu Pindahkan.
const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");

const OLD = "HAZID & HAZOP Study";
const REPORT = "Report PHA";
const EVIDENCE = "Evidence PHA";
const ACTOR = "Sistem (pemilahan Report/Evidence PHA)";

const env = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
const sql = neon(env.slice("DATABASE_URL=".length).replace(/^"|"$/g, ""));
const args = process.argv.slice(2);
const apply = args[0] === "--apply";
const rollback = args[0] === "--rollback";
const file = args[1];

async function moveDocs(ids, toCategoryId, fromName, toName, location) {
  if (ids.length === 0) return;
  await sql.query("update documents set category_id = $1, updated_at = now() where id = any($2::uuid[])", [toCategoryId, ids]);
  const hist = await sql.query(
    `insert into history_items (document_id, actor_name, actor_role, location, action, notes, file_id, version)
     select id, $2, 'Sistem', location, 'Revised', 'Pembaruan sub-kategori dokumen', primary_file_id, current_version
     from documents where id = any($1::uuid[]) returning id`,
    [ids, ACTOR]
  );
  await sql.query(
    `insert into history_diffs (history_item_id, field, old_value, new_value) select x, 'Sub-kategori', $2, $3 from unnest($1::uuid[]) as x`,
    [hist.map((h) => h.id), fromName, toName]
  );
  await sql.query(
    `insert into audit_log (actor_name, action, target_type, target_id, target_label, location, detail)
     values ($1, 'dokumen.dipindah', 'sub-dokumen', $2, $3, $4, $5)`,
    [ACTOR, toCategoryId, toName, location, JSON.stringify({ jumlah: ids.length, dari: fromName })]
  );
}

(async () => {
  if (rollback) {
    const map = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const loc of map.locations) {
      await moveDocs(loc.moved, loc.reportCategoryId, EVIDENCE, REPORT, loc.location);
      if (loc.createdEvidence) await sql.query("delete from document_categories where id = $1 and not exists (select 1 from documents where category_id = $1)", [loc.evidenceCategoryId]);
      if (loc.renamed) await sql.query("update document_categories set name = $2 where id = $1 and name = $3", [loc.reportCategoryId, OLD, REPORT]);
      console.log("dikembalikan:", loc.location, loc.moved.length);
    }
    return;
  }

  const cats = await sql.query("select id, location, name, review_cycle_months, treat_expiry_as_review_only from document_categories where name = any($1::text[])", [[OLD, REPORT, EVIDENCE]]);
  const byLoc = new Map();
  for (const c of cats) {
    const g = byLoc.get(c.location) ?? {};
    if (c.name === EVIDENCE) g.evidence = c;
    else g.report = g.report && g.report.name === REPORT ? g.report : c; // utamakan yang sudah bernama Report PHA
    byLoc.set(c.location, g);
  }
  const plan = [];
  let total = 0;
  for (const [location, g] of byLoc) {
    if (!g.report) continue;
    const ev = await sql.query(
      `select id from documents where category_id = $1 and deleted_at is null and title !~* '(report|laporan)'`,
      [g.report.id]
    );
    const rep = await sql.query(
      `select count(*)::int n from documents where category_id = $1 and deleted_at is null and title ~* '(report|laporan)'`,
      [g.report.id]
    );
    plan.push({ location, report: g.report, evidence: g.evidence ?? null, toMove: ev.map((r) => r.id), reports: rep[0].n });
    total += ev.length;
  }
  console.log(`${apply ? "TERAPKAN" : "SIMULASI"}: ${plan.length} lokasi, ${total} dokumen akan dipindah ke ${EVIDENCE}`);
  for (const p of plan) console.log(`  ${p.location.padEnd(28)} report tetap: ${String(p.reports).padStart(3)} | ke evidence: ${String(p.toMove.length).padStart(3)} | kategori lama: ${p.report.name}`);
  if (!apply) return;

  const out = { createdAt: new Date().toISOString(), locations: [] };
  for (const p of plan) {
    let renamed = false;
    if (p.report.name === OLD) {
      await sql.query("update document_categories set name = $2 where id = $1", [p.report.id, REPORT]);
      renamed = true;
    }
    let evidence = p.evidence;
    let createdEvidence = false;
    if (!evidence) {
      const ins = await sql.query(
        `insert into document_categories (location, name, review_cycle_months, treat_expiry_as_review_only, is_custom)
         values ($1, $2, $3, true, true) returning id, location, name`,
        [p.location, EVIDENCE, p.report.review_cycle_months]
      );
      evidence = ins[0];
      createdEvidence = true;
    }
    await moveDocs(p.toMove, evidence.id, REPORT, EVIDENCE, p.location);
    out.locations.push({ location: p.location, reportCategoryId: p.report.id, evidenceCategoryId: evidence.id, renamed, createdEvidence, moved: p.toMove });
    console.log("selesai:", p.location, p.toMove.length);
  }
  fs.writeFileSync(file, JSON.stringify(out));
  console.log("peta pengembalian tersimpan:", file);
})().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
