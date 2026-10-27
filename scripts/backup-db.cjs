// Ekspor cadangan database: satu berkas JSON per tabel + manifest (jumlah baris dan sha256).
// Jalankan: node scripts/backup-db.cjs   (membaca DATABASE_URL dari .env.local atau lingkungan)
// Keluaran: BACKUP_DIR, atau ~/psionevision-backup/<tanggal-jam>. Di LUAR repositori.
// PERINGATAN: berkas hasil berisi data sensitif (akun, hash sandi, isi dokumen). Simpan terenkripsi, jangan
// dikirim lewat surel/chat dan jangan di-commit. Berkas di R2 TIDAK ikut diekspor (cadangkan bucket terpisah).
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { neon } = require("@neondatabase/serverless");

// Tabel sementara/sesi: tidak perlu dicadangkan.
const EXCLUDE = new Set(["sessions", "login_attempts", "password_reset_tokens", "email_verification_tokens", "mfa_challenges"]);
const PAGE = 5000;

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const file = path.join(__dirname, "..", ".env.local");
  const line = fs.readFileSync(file, "utf8").split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
  if (!line) throw new Error("DATABASE_URL tidak ditemukan");
  return line.slice("DATABASE_URL=".length).replace(/^"|"$/g, "");
}

(async () => {
  const sql = neon(databaseUrl());
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
  const dir = path.join(process.env.BACKUP_DIR || path.join(os.homedir(), "psionevision-backup"), stamp);
  fs.mkdirSync(dir, { recursive: true });

  const tables = (await sql`select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`)
    .map((r) => r.table_name)
    .filter((t) => !EXCLUDE.has(t) && !t.startsWith("__"));

  const manifest = { dibuat: new Date().toISOString(), tabel: {} };
  for (const t of tables) {
    const rows = [];
    for (let off = 0; ; off += PAGE) {
      const part = await sql.query(`select * from "${t}" order by 1 limit ${PAGE} offset ${off}`);
      rows.push(...part);
      if (part.length < PAGE) break;
    }
    const body = JSON.stringify(rows);
    fs.writeFileSync(path.join(dir, t + ".json"), body);
    manifest.tabel[t] = { baris: rows.length, sha256: crypto.createHash("sha256").update(body).digest("hex") };
    console.log(t.padEnd(32), rows.length);
  }
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("\nSelesai:", dir);
  console.log("PERINGATAN: folder ini berisi data sensitif. Simpan terenkripsi dan jangan di-commit.");
})().catch((e) => {
  console.error("GAGAL:", e.message);
  process.exit(1);
});
