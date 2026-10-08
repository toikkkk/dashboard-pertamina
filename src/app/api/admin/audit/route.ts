// Membaca jejak audit — HANYA Admin Regional. Mendukung penyaringan menurut kelompok aksi dan pencarian bebas
// (pelaku/sasaran/lokasi/IP). Tidak ada endpoint tulis/hapus: log hanya bertambah lewat logAudit().
import { NextRequest, NextResponse } from "next/server";
import { and, desc, ilike, or, sql, like } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLog } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertRegionalAdmin } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";

const GROUPS: Record<string, string> = { masuk: "login%", keluar: "logout", akun: "akun.%", akses: "akses.%", sandi: "sandi.%", berkas: "berkas.%", dokumen: "dokumen.%" };

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertRegionalAdmin(user);

    const sp = req.nextUrl.searchParams;
    const group = sp.get("kelompok") ?? "";
    const q = (sp.get("q") ?? "").trim().slice(0, 100);
    const limit = Math.min(Math.max(parseInt(sp.get("limit") ?? "200", 10) || 200, 1), 500);

    const conds = [];
    if (group === "masuk") conds.push(or(like(auditLog.action, "login%"), like(auditLog.action, "logout"))!);
    else if (GROUPS[group]) conds.push(like(auditLog.action, GROUPS[group]));
    if (q) {
      const p = `%${q.replace(/[%_]/g, "")}%`;
      conds.push(or(ilike(auditLog.actorName, p), ilike(auditLog.actorEmail, p), ilike(auditLog.targetLabel, p), ilike(auditLog.location, p), ilike(auditLog.ipAddress, p), ilike(auditLog.action, p))!);
    }

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(auditLog).where(conds.length ? and(...conds) : undefined).orderBy(desc(auditLog.createdAt)).limit(limit),
      db.select({ total: sql<number>`count(*)::int` }).from(auditLog),
    ]);
    return NextResponse.json({ rows, total });
  });
}
