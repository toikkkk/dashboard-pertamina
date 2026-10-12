// Menyeragamkan kata sandi SEMUA akun demo (email @demo.invalid) ke satu nilai — atas permintaan user, agar gampang
// dicoba client. Dijalankan MANUAL:  DEMO_NEW_PASSWORD=... npx tsx scripts/reset-demo-passwords.ts
// Hanya menyentuh akun berpenanda @demo.invalid. Nilai langsung ditulis ke hash di database (melewati aturan
// kekuatan sandi saat pendaftaran — login hanya memeriksa hash). Sesi lama akun-akun itu dicabut. Dicatat di audit_log.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { inArray, like } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { users, sessions, auditLog } from "../src/lib/db/schema";
import { hashPassword } from "../src/lib/auth/password";

async function main() {
  const pw = process.env.DEMO_NEW_PASSWORD;
  if (!pw) throw new Error("Set DEMO_NEW_PASSWORD.");
  const rows = await db.select({ id: users.id }).from(users).where(like(users.email, "%@demo.invalid"));
  if (rows.length === 0) throw new Error("Tidak ada akun @demo.invalid.");
  for (const r of rows) {
    const passwordHash = await hashPassword(pw);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(inArray(users.id, [r.id]));
  }
  const ids = rows.map((r) => r.id);
  await db.delete(sessions).where(inArray(sessions.userId, ids));
  await db.insert(auditLog).values({
    action: "akun.demo_sandi_diseragamkan",
    actorName: "Skrip reset-demo-passwords",
    targetType: "akun",
    targetLabel: `${rows.length} akun demo (@demo.invalid)`,
    detail: { jumlah: rows.length, sesiDicabut: true },
  });
  console.log(`Selesai: ${rows.length} akun demo diatur ke kata sandi seragam; sesi lama dicabut.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error("GAGAL:", e instanceof Error ? e.message : e); process.exit(1); });
