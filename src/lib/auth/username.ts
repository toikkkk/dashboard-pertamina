// Aturan nama pengguna untuk masuk: huruf kecil, angka, titik, garis bawah, strip; 3-30
// karakter. Dicocokkan tanpa membedakan huruf besar/kecil. Tidak boleh mengandung "@"
// supaya pengenal masuk selalu jelas: ada "@" = email, tanpa "@" = username.
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;
export const USERNAME_MESSAGE = "Username 3-30 karakter: huruf, angka, titik, garis bawah, atau strip.";

export const normalizeUsername = (v: string) => v.trim().toLowerCase();

// Turunan dari bagian depan email, dibersihkan agar lolos aturan, lalu dibuat unik.
export async function uniqueUsername(seed: string): Promise<string> {
  let base = normalizeUsername(seed.split("@")[0]).replace(/[^a-z0-9._-]+/g, "").slice(0, 26);
  if (base.length < 3) base = (base + "user").slice(0, 26);
  let candidate = base;
  for (let i = 0; i < 50; i++) {
    const [hit] = await db.select({ id: users.id }).from(users).where(sql`lower(${users.username}) = ${candidate}`).limit(1);
    if (!hit) return candidate;
    candidate = `${base}${i + 2}`;
  }
  return `${base}${Date.now().toString().slice(-4)}`;
}
