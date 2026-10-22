// Menukar token dari tautan email dengan status "terverifikasi". Publik (tautan dibuka dari email, bisa tanpa sesi).
// Token sekali pakai dan kedaluwarsa; hanya hash-nya yang tersimpan.
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { emailVerificationTokens, users } from "@/lib/db/schema";
import { withErrorHandling } from "@/lib/api/respond";
import { logAudit } from "@/lib/audit";

const bodySchema = z.object({ token: z.string().trim().min(16).max(200) });

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const { token } = bodySchema.parse(await req.json());
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const [row] = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.tokenHash, tokenHash)).limit(1);
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      return NextResponse.json({ error: "Tautan verifikasi tidak valid atau sudah kedaluwarsa. Minta tautan baru dari Pengaturan › Keamanan Akun." }, { status: 400 });
    }
    const now = new Date();
    if (row.newEmail) {
      // Konfirmasi ganti email: pastikan alamat itu belum dipakai akun lain, lalu pindahkan email akun ke alamat baru.
      const [taken] = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${row.newEmail.toLowerCase()} and ${users.id} <> ${row.userId}`).limit(1);
      if (taken) return NextResponse.json({ error: "Email itu sudah dipakai akun lain. Ajukan penggantian dengan email lain." }, { status: 409 });
      const [before] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, row.userId)).limit(1);
      await Promise.all([
        db.update(emailVerificationTokens).set({ usedAt: now }).where(eq(emailVerificationTokens.id, row.id)),
        db.update(users).set({ email: row.newEmail.toLowerCase(), emailVerifiedAt: now, updatedAt: now }).where(eq(users.id, row.userId)),
      ]);
      await logAudit(req, { id: row.userId, name: before?.name, email: row.newEmail }, "email.diganti", { targetType: "user", targetId: row.userId, detail: { dari: before?.email } });
      return NextResponse.json({ message: "Email akun diganti dan terverifikasi." });
    }
    await Promise.all([
      db.update(emailVerificationTokens).set({ usedAt: now }).where(eq(emailVerificationTokens.id, row.id)),
      db.update(users).set({ emailVerifiedAt: now, updatedAt: now }).where(eq(users.id, row.userId)),
    ]);
    const [u] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, row.userId)).limit(1);
    await logAudit(req, { id: row.userId, name: u?.name, email: u?.email }, "email.diverifikasi", { targetType: "user", targetId: row.userId });
    return NextResponse.json({ message: "Email berhasil diverifikasi." });
  });
}
