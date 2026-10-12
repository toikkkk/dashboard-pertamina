// Menyiapkan akun demo untuk SETIAP terminal dan SETIAP peran (permintaan client, 2026-10-12), plus satu akun
// Admin Regional. Dijalankan MANUAL:  npx tsx scripts/seed-demo-accounts.ts [--dry-run]
//
// Aturan keamanan skrip ini:
//  - kata sandi unik & acak per akun (BUKAN "Demo12345!"), memenuhi kebijakan sandi; hanya hash-nya yang masuk database;
//  - kata sandi mentah ditulis ke berkas JSON di DEMO_ACCOUNTS_OUT (di luar repo), tidak pernah ke layar/log;
//  - semua akun bertanda email @demo.invalid dan username berawalan "demo-" supaya mudah dihapus massal nanti;
//  - idempoten: akun yang email-nya sudah ada dilewati (kata sandinya TIDAK diubah dan tidak dilaporkan ulang).
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { randomInt } from "crypto";
import { writeFileSync } from "fs";
import { inArray } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { locations, users, auditLog } from "../src/lib/db/schema";
import { hashPassword } from "../src/lib/auth/password";
import { isPasswordStrong } from "../src/lib/domain/rules";
import { REGIONAL_UNIT_NAME } from "../src/lib/domain/regionalUnit";

const DRY = process.argv.includes("--dry-run");
const OUT = process.env.DEMO_ACCOUNTS_OUT ?? "";
const DOMAIN = "demo.invalid";
const INITIATOR = "Penanggung Jawab PSI (Initiator)";
const CONTROLLER = "PSI / MOC Controller";

interface RoleSpec {
  code: string;
  label: string; // dipakai di nama akun
  role: string;
  mocRoles: string[];
  mocFunction: string | null;
  keterangan: string;
}

const ROLES: RoleSpec[] = [
  { code: "ini", label: "Initiator", role: INITIATOR, mocRoles: [], mocFunction: null, keterangan: "Mengunggah & mengelola dokumen terminal sendiri; mengajukan MOC" },
  { code: "ctl", label: "Controller", role: CONTROLLER, mocRoles: [], mocFunction: null, keterangan: "Mengunggah & mengelola dokumen; mendaftarkan MOC (memberi Nomor MoC)" },
  { code: "rvm", label: "Reviewer Maintenance", role: INITIATOR, mocRoles: ["Reviewer"], mocFunction: "Maintenance Service", keterangan: "Mereview MOC (fungsi Maintenance Service)" },
  { code: "rvh", label: "Reviewer HSSE", role: INITIATOR, mocRoles: ["Reviewer"], mocFunction: "HSSE", keterangan: "Mereview MOC (fungsi HSSE)" },
  { code: "apv", label: "Approver", role: INITIATOR, mocRoles: ["Approver"], mocFunction: "Terminal Manager", keterangan: "Menyetujui / menolak MOC dan menunjuk Performer" },
  { code: "prf", label: "Performer", role: INITIATOR, mocRoles: ["Performer"], mocFunction: null, keterangan: "Pelaksana perubahan MOC yang ditunjuk Approver" },
];

// Unit Regional Jatimbalinus (MOC level regional): fungsi menurut TKO B13.3-07 Tabel 3 kolom "Region / AP".
const REGIONAL_ROLES: RoleSpec[] = [
  { code: "ini", label: "Initiator Regional", role: INITIATOR, mocRoles: [], mocFunction: null, keterangan: "Mengajukan MOC level regional" },
  { code: "ctl", label: "Controller HSSE Regional", role: CONTROLLER, mocRoles: [], mocFunction: null, keterangan: "Mendaftarkan MOC regional (memberi Nomor MoC)" },
  { code: "rvr", label: "Reviewer RPD", role: INITIATOR, mocRoles: ["Reviewer"], mocFunction: "RPD", keterangan: "Mereview MOC regional (fungsi RPD)" },
  { code: "rvh", label: "Reviewer HSSE Regional", role: INITIATOR, mocRoles: ["Reviewer"], mocFunction: "HSSE Regional", keterangan: "Mereview MOC regional (fungsi HSSE Regional)" },
  { code: "rvi", label: "Reviewer Fungsi IT", role: INITIATOR, mocRoles: ["Reviewer"], mocFunction: "Fungsi IT", keterangan: "Mereview MOC regional untuk perubahan sistem/aplikasi (scope 13)" },
  { code: "apv", label: "Approver Manager Fungsi Regional", role: INITIATOR, mocRoles: ["Approver"], mocFunction: "Manager Fungsi Regional", keterangan: "Menyetujui / menolak MOC regional dan menunjuk Performer" },
  { code: "prf", label: "Performer Regional", role: INITIATOR, mocRoles: ["Performer"], mocFunction: null, keterangan: "Pelaksana perubahan MOC regional yang ditunjuk Approver" },
];

const slug = (s: string) => s.toLowerCase().replace(/[()]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Alfabet tanpa karakter yang mudah tertukar (0/O, 1/l/I).
const UP = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LO = "abcdefghijkmnpqrstuvwxyz";
const DG = "23456789";
const pick = (set: string) => set[randomInt(set.length)];
function makePassword(): string {
  for (;;) {
    const block = () => pick(UP) + pick(LO) + pick(LO + DG) + pick(DG);
    const pw = `${block()}-${block()}-${block()}`;
    if (isPasswordStrong(pw)) return pw; // ada kapital, kecil, angka, simbol "-"
  }
}

interface Planned {
  terminal: string;
  peran: string;
  nama: string;
  username: string;
  email: string;
  role: string;
  location: string | null;
  isRegionalAdmin: boolean;
  mocRoles: string[];
  mocFunction: string | null;
  keterangan: string;
}

async function main() {
  if (!DRY && !OUT) throw new Error("Set DEMO_ACCOUNTS_OUT=<path .json di luar repo> untuk menyimpan kata sandi.");
  const locs = (await db.select({ name: locations.name }).from(locations)).map((l) => l.name).sort();
  const plan: Planned[] = [];
  for (const terminal of locs) {
    for (const r of terminal === REGIONAL_UNIT_NAME ? REGIONAL_ROLES : ROLES) {
      plan.push({
        terminal,
        peran: r.label,
        nama: terminal === REGIONAL_UNIT_NAME ? r.label : `${r.label} ${terminal}`,
        username: `demo-${r.code}.${slug(terminal)}`,
        email: `demo-${r.code}.${slug(terminal)}@${DOMAIN}`,
        role: r.role,
        location: terminal,
        isRegionalAdmin: false,
        mocRoles: r.mocRoles,
        mocFunction: r.mocFunction,
        keterangan: r.keterangan,
      });
    }
  }
  plan.push({
    terminal: "Semua terminal",
    peran: "Admin Regional",
    nama: "Admin Regional Demo",
    username: "demo-regional",
    email: `demo-regional@${DOMAIN}`,
    role: "Admin Regional",
    location: null,
    isRegionalAdmin: true,
    mocRoles: [],
    mocFunction: null,
    keterangan: "Melihat & mengunggah dokumen semua terminal; Kelola User; Log Aktivitas; MOC hanya dapat dilihat",
  });

  const tooLong = plan.filter((p) => p.username.length > 30);
  if (tooLong.length) throw new Error("Username melebihi 30 karakter: " + tooLong.map((p) => p.username).join(", "));
  if (new Set(plan.map((p) => p.username)).size !== plan.length) throw new Error("Username tidak unik dalam rencana.");

  const existing = new Set(
    (await db.select({ email: users.email }).from(users).where(inArray(users.email, plan.map((p) => p.email)))).map((u) => u.email)
  );
  const todo = plan.filter((p) => !existing.has(p.email));
  console.log(`Terminal: ${locs.length} | rencana: ${plan.length} akun | sudah ada: ${existing.size} | akan dibuat: ${todo.length}${DRY ? " (DRY RUN)" : ""}`);
  if (DRY || todo.length === 0) return;

  const created: (Planned & { password: string })[] = [];
  for (const p of todo) {
    const password = makePassword();
    const passwordHash = await hashPassword(password);
    await db
      .insert(users)
      .values({
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
      })
      .onConflictDoNothing();
    created.push({ ...p, password });
  }
  writeFileSync(OUT, JSON.stringify(created, null, 2), "utf-8");
  await db.insert(auditLog).values({
    action: "akun.demo_dibuat",
    actorName: "Skrip seed-demo-accounts",
    targetType: "akun",
    targetLabel: `${created.length} akun demo (@${DOMAIN})`,
    detail: { jumlah: created.length, unit: locs.length, peranPerTerminal: ROLES.length, peranRegional: REGIONAL_ROLES.length },
  });
  console.log(`Selesai: ${created.length} akun dibuat. Kata sandi disimpan di berkas keluaran (di luar repo).`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("GAGAL:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
