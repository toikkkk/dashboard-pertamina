// Hapus beberapa user sekaligus (centang di /admin/users). Tiap user dihapus terpisah
// dengan aturan yang sama seperti DELETE /api/admin/users/[id]: hanya Admin Regional,
// akun sendiri dilewati, akun yang sudah tercatat pada dokumen/MOC/riwayat ditolak
// Postgres (foreign key 23503) dan dilaporkan di `failed` — satu yang gagal tidak
// membatalkan yang lain.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertRegionalAdmin } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";

const bodySchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(100) });

const REFERENCED = "Sudah tercatat pada dokumen, MOC, atau riwayat.";

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const admin = await requireSessionUser();
    assertRegionalAdmin(admin);
    const { ids } = bodySchema.parse(await req.json());

    const deleted: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const id of Array.from(new Set(ids))) {
      if (id === admin.id) {
        failed.push({ id, error: "Akun sendiri tidak dapat dihapus." });
        continue;
      }
      try {
        const rows = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
        if (rows.length === 0) failed.push({ id, error: "User tidak ditemukan." });
        else deleted.push(id);
      } catch (err) {
        const code = (err as { code?: string })?.code ?? (err as { cause?: { code?: string } })?.cause?.code;
        if (code === "23503") failed.push({ id, error: REFERENCED });
        else {
          console.error(err);
          failed.push({ id, error: "Terjadi kesalahan pada server." });
        }
      }
    }

    return NextResponse.json({ deleted, failed });
  });
}
