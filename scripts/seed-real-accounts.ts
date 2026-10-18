// Membuat 174 akun sungguhan dari "List KBO Jatimbalinus.xlsx" dan menghapus akun demo.
// Dijalankan MANUAL:
//   npx tsx scripts/seed-real-accounts.ts                (SIMULASI, tidak menulis apa pun; bawaan)
//   INITIAL_PASSWORD=... ACCOUNTS_OUT=<json di luar repo> npx tsx scripts/seed-real-accounts.ts --apply
//
// Komposisi (kesepakatan 2026-10-13/18): per KBO satu Initiator dan satu Approver (47+47); Controller = HSSE tiap
// terminal + HSSE Regional (26); Reviewer lokasi = DRE + HSSE tiap terminal (50); Reviewer Regional = RPD, HSSE, IT (3);
// satu Admin Regional. Total 174. Performer TIDAK punya akun.
// Username: orang = dua kata pertama nama + ".ini"/".apv" (jabatan Vacant memakai kode KBO); fungsi = "hsse.<lokasi>",
// "rv-dre.<lokasi>", "rv-hsse.<lokasi>". Email: Initiator memakai email Pertamina bila ada, selain itu email penanda
// @akun.portal.invalid. Semua akun wajib ganti kata sandi saat login pertama (must_change_password).
//
// Keamanan: kata sandi awal hanya dari env INITIAL_PASSWORD (tidak pernah di kode/log), disimpan sebagai hash.
// --apply: (1) menghapus akun demo (email @demo.invalid atau username berawalan "demo-") setelah mengosongkan
// kolom rujukan yang boleh kosong; bila ada rujukan NOT NULL, berhenti sebelum menulis apa pun; (2) membuat akun baru.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import path from "path";
import { writeFileSync } from "fs";
import * as XLSX from "xlsx";
import { sql, inArray } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { locations, users, auditLog } from "../src/lib/db/schema";
import { hashPassword } from "../src/lib/auth/password";
import { isPasswordStrong } from "../src/lib/domain/rules";
import { KBO_BY_LOCATION, REGIONAL_KBO_FUNCTIONS } from "../src/lib/domain/kbo";
import { REGIONAL_UNIT_NAME } from "../src/lib/domain/regionalUnit";

const APPLY = process.argv.includes("--apply");
const XLSX_PATH = process.env.KBO_XLSX ?? path.resolve(__dirname, "../../List KBO Jatimbalinus.xlsx");
const MARK_DOMAIN = "akun.portal.invalid";
const INITIATOR = "Penanggung Jawab PSI (Initiator)";
const CONTROLLER = "PSI / MOC Controller";

interface Planned {
  grup: string;
  nama: string;
  username: string;
  email: string;
  role: string;
  location: string | null;
  isRegionalAdmin: boolean;
  mocRoles: string[];
  mocFunction: string | null;
  kbo: string;
}

const slug = (s: string) => s.toLowerCase().replace(/[()]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const usernameBase = (name: string, kbo: string) => {
  if (/^vacant/i.test(name)) return kbo.toLowerCase();
  const tokens = name.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((t) => t.length > 1);
  return tokens.slice(0, 2).join(".") || kbo.toLowerCase();
};

// KBO -> nama lokasi aplikasi utama (lokasi pertama yang memakai KBO itu; Larantuka/subarea IT Surabaya ikut induknya).
const PRIMARY_LOCATION_BY_KBO = new Map<string, string>();
for (const [loc, kbo] of Object.entries(KBO_BY_LOCATION)) {
  if (!PRIMARY_LOCATION_BY_KBO.has(kbo) && !/larantuka|\(/i.test(loc)) PRIMARY_LOCATION_BY_KBO.set(kbo, loc);
}
const REGIONAL_FUNCTION_BY_KBO = new Map(REGIONAL_KBO_FUNCTIONS.map((f) => [f.kbo, f.label]));
// KBO regional di List KBO yang tidak ada di daftar fungsi MOC (jabatan IA kedua, Vacant): tetap diberi akun.
REGIONAL_FUNCTION_BY_KBO.set("PNA353000", "Internal Audit (IA) - jabatan kedua");

async function main() {
  const wb = XLSX.readFile(XLSX_PATH);
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[wb.SheetNames[0]]);
  const appLocations = new Set((await db.select({ name: locations.name }).from(locations)).map((l) => l.name));

  const plan: Planned[] = [];
  const issues: string[] = [];
  const terminalLocs: string[] = [];
  const used = new Set<string>();
  const uniq = (u: string) => {
    let c = u;
    for (let i = 2; used.has(c); i++) c = `${u}${i}`;
    used.add(c);
    return c;
  };
  const markEmail = (u: string) => `${u}@${MARK_DOMAIN}`;

  for (const r of rows) {
    const nama = String(r["Name"] ?? "").trim();
    const kbo = String(r["KBO"] ?? "").trim();
    const posisi = String(r["Position"] ?? "").trim();
    const email = String(r["Email"] ?? "").trim();
    if (!kbo) continue;
    const regionalFn = REGIONAL_FUNCTION_BY_KBO.get(kbo);
    const termLoc = PRIMARY_LOCATION_BY_KBO.get(kbo);
    let location: string | null = null;
    let grup = "";
    if (termLoc && appLocations.has(termLoc)) {
      location = termLoc;
      grup = "Terminal";
      if (!terminalLocs.includes(termLoc)) terminalLocs.push(termLoc);
    } else if (regionalFn) {
      location = REGIONAL_UNIT_NAME;
      grup = "Regional";
    } else {
      issues.push(`KBO ${kbo} (${posisi}) tidak cocok dengan lokasi atau fungsi regional di aplikasi; Initiator/Approver-nya dilewati.`);
      continue;
    }
    const base = usernameBase(nama, kbo);
    const displayName = /^vacant/i.test(nama) ? `Vacant (${kbo})` : nama;
    const ini = uniq(`${base}.ini`);
    const apv = uniq(`${base}.apv`);
    const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email.toLowerCase() : "";
    plan.push({ grup: `${grup} - Initiator`, nama: displayName, username: ini, email: validEmail || markEmail(ini), role: INITIATOR, location, isRegionalAdmin: false, mocRoles: [], mocFunction: null, kbo });
    plan.push({
      grup: `${grup} - Approver`,
      nama: displayName,
      username: apv,
      email: markEmail(apv),
      role: INITIATOR,
      location,
      isRegionalAdmin: false,
      mocRoles: ["Approver"],
      mocFunction: grup === "Terminal" ? "Terminal Manager" : "Manager Fungsi Regional",
      kbo,
    });
  }

  for (const loc of terminalLocs) {
    const s = slug(loc);
    const kbo = KBO_BY_LOCATION[loc] ?? "";
    const mk = (grup: string, nama: string, username: string, role: string, mocRoles: string[], mocFunction: string | null) =>
      plan.push({ grup, nama, username: uniq(username), email: markEmail(username), role, location: loc, isRegionalAdmin: false, mocRoles, mocFunction, kbo });
    mk("Terminal - Controller", `Controller HSSE ${loc}`, `hsse.${s}`, CONTROLLER, [], null);
    mk("Terminal - Reviewer", `Reviewer DRE ${loc}`, `rv-dre.${s}`, INITIATOR, ["Reviewer"], "Maintenance Service (DRE)");
    mk("Terminal - Reviewer", `Reviewer HSSE ${loc}`, `rv-hsse.${s}`, INITIATOR, ["Reviewer"], "HSSE");
  }
  const reg = (grup: string, nama: string, username: string, role: string, mocRoles: string[], mocFunction: string | null) =>
    plan.push({ grup, nama, username: uniq(username), email: markEmail(username), role, location: REGIONAL_UNIT_NAME, isRegionalAdmin: false, mocRoles, mocFunction, kbo: "PPNLL0400" });
  reg("Regional - Controller", "Controller HSSE Regional", "hsse.regional", CONTROLLER, [], null);
  reg("Regional - Reviewer", "Reviewer RPD Regional", "rv-dre.regional", INITIATOR, ["Reviewer"], "RPD");
  reg("Regional - Reviewer", "Reviewer HSSE Regional", "rv-hsse.regional", INITIATOR, ["Reviewer"], "HSSE Regional");
  reg("Regional - Reviewer", "Reviewer Fungsi IT Regional", "rv-it.regional", INITIATOR, ["Reviewer"], "Fungsi IT");
  plan.push({ grup: "Admin Regional", nama: "Admin Regional", username: uniq("admin.regional"), email: markEmail("admin.regional"), role: "Admin Regional", location: null, isRegionalAdmin: true, mocRoles: [], mocFunction: null, kbo: "" });

  // Pemeriksaan rencana.
  const tooLong = plan.filter((p) => p.username.length > 30);
  if (tooLong.length) issues.push("Username melebihi 30 karakter: " + tooLong.map((p) => p.username).join(", "));
  const emailDup = plan.filter((p, i) => plan.findIndex((q) => q.email === p.email) !== i);
  if (emailDup.length) issues.push("Email ganda dalam rencana: " + emailDup.map((p) => p.email).join(", "));

  const byGrup = new Map<string, number>();
  for (const p of plan) byGrup.set(p.grup.replace(/^(Terminal|Regional) - /, ""), (byGrup.get(p.grup.replace(/^(Terminal|Regional) - /, "")) ?? 0) + 1);
  console.log(`Rencana: ${plan.length} akun (target 174) | terminal berakun: ${terminalLocs.length} | ${APPLY ? "APPLY" : "SIMULASI"}`);
  console.log("Per peran:", Object.fromEntries(byGrup));
  for (const i of issues) console.log("PERHATIAN:", i);

  // Dampak penghapusan akun demo.
  const demoIds = (await db.select({ id: users.id }).from(users).where(sql`${users.email} like '%@demo.invalid' or lower(${users.username}) like 'demo-%'`)).map((u) => u.id);
  const fks = (await db.execute(sql`
    select kcu.table_name as tbl, kcu.column_name as col, c.is_nullable as nullable, rc.delete_rule as rule
    from information_schema.referential_constraints rc
    join information_schema.key_column_usage kcu on kcu.constraint_name = rc.constraint_name
    join information_schema.constraint_column_usage ccu on ccu.constraint_name = rc.constraint_name
    join information_schema.columns c on c.table_name = kcu.table_name and c.column_name = kcu.column_name
    where ccu.table_name = 'users' and ccu.column_name = 'id'`)).rows as { tbl: string; col: string; nullable: string; rule: string }[];
  console.log(`Akun demo yang akan dihapus: ${demoIds.length}`);
  const blocking: string[] = [];
  for (const f of fks) {
    if (demoIds.length === 0) break;
    const cnt = Number(
      ((await db.execute(sql.raw(`select count(*)::int as n from "${f.tbl}" where "${f.col}" in (${demoIds.map((i) => `'${i}'`).join(",")})`))).rows[0] as { n: number }).n
    );
    if (cnt === 0) continue;
    const action = f.rule === "CASCADE" ? "ikut terhapus" : f.nullable === "YES" ? "dikosongkan (NULL)" : "MEMBLOKIR";
    console.log(`  ${f.tbl}.${f.col}: ${cnt} baris ${action}`);
    if (action === "MEMBLOKIR") blocking.push(`${f.tbl}.${f.col}`);
  }
  if (blocking.length) issues.push("Rujukan NOT NULL ke akun demo: " + blocking.join(", "));

  const existing = new Set((await db.select({ u: users.username }).from(users).where(inArray(users.username, plan.map((p) => p.username)))).map((r) => r.u));
  if (existing.size) issues.push(`Username sudah dipakai akun lain: ${Array.from(existing).join(", ")}`);

  if (process.env.ACCOUNTS_PLAN_OUT) {
    writeFileSync(process.env.ACCOUNTS_PLAN_OUT, JSON.stringify(plan, null, 2), "utf-8");
    console.log("Rencana lengkap ditulis ke ACCOUNTS_PLAN_OUT.");
  }
  if (!APPLY) return;

  const pw = process.env.INITIAL_PASSWORD ?? "";
  if (!isPasswordStrong(pw)) throw new Error("INITIAL_PASSWORD kosong/lemah (butuh kapital, kecil, angka, simbol, panjang cukup).");
  if (issues.length) throw new Error("Masih ada masalah pada rencana; perbaiki dulu:\n- " + issues.join("\n- "));
  if (!process.env.ACCOUNTS_OUT) throw new Error("Set ACCOUNTS_OUT=<path .json di luar repo> untuk daftar akun (tanpa kata sandi).");

  // 1) Kosongkan rujukan yang boleh NULL lalu hapus akun demo.
  if (demoIds.length > 0) {
    const idList = demoIds.map((i) => `'${i}'`).join(",");
    for (const f of fks) if (f.rule !== "CASCADE" && f.nullable === "YES") await db.execute(sql.raw(`update "${f.tbl}" set "${f.col}" = null where "${f.col}" in (${idList})`));
    await db.execute(sql.raw(`delete from "users" where "id" in (${idList})`));
    console.log(`Akun demo dihapus: ${demoIds.length}`);
  }
  // 2) Buat akun baru.
  const passwordHash = await hashPassword(pw);
  for (const p of plan) {
    await db.insert(users).values({
      name: p.nama,
      email: p.email,
      passwordHash,
      role: p.role,
      location: p.location,
      isRegionalAdmin: p.isRegionalAdmin,
      mocRoles: p.mocRoles,
      mocFunction: p.mocFunction,
      username: p.username,
      emailVerifiedAt: new Date(),
      mustChangePassword: true,
    });
  }
  writeFileSync(process.env.ACCOUNTS_OUT, JSON.stringify(plan.map(({ grup, nama, username, email, location }) => ({ grup, nama, username, email, location })), null, 2), "utf-8");
  await db.insert(auditLog).values({
    action: "akun.sungguhan_dibuat",
    actorName: "Skrip seed-real-accounts",
    targetType: "akun",
    targetLabel: `${plan.length} akun sungguhan; ${demoIds.length} akun demo dihapus`,
    detail: { jumlah: plan.length, demoDihapus: demoIds.length },
  });
  console.log(`Selesai: ${plan.length} akun dibuat (wajib ganti sandi saat login pertama).`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("GAGAL:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
