// Aksi massal Sampah: pindah banyak dokumen ke Sampah, pulihkan, atau hapus permanen sekaligus. Tiap dokumen
// diperiksa haknya sendiri-sendiri (Admin Regional, atau user terminal dokumen itu) dan diproses terpisah: satu yang gagal
// tidak membatalkan yang lain — hasil per dokumen dikembalikan. Dibatasi 50 per panggilan (batas waktu fungsi).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api/respond";
import { moveToTrash, purgeFromTrash, restoreFromTrash } from "@/lib/api/trash";

const MAX_IDS = 50;
const bodySchema = z.object({
  action: z.enum(["trash", "restore", "purge"]),
  ids: z.array(z.string().uuid()).min(1).max(MAX_IDS),
});

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const { action, ids } = bodySchema.parse(await req.json());
    const uniqueIds = Array.from(new Set(ids));
    const rows = await db.select().from(documents).where(inArray(documents.id, uniqueIds));
    const byId = new Map(rows.map((r) => [r.id, r]));

    const results: { id: string; ok: boolean; error?: string }[] = [];
    for (const id of uniqueIds) {
      const row = byId.get(id);
      if (!row) {
        results.push({ id, ok: false, error: "Dokumen tidak ditemukan." });
        continue;
      }
      try {
        if (action === "trash") await moveToTrash(req, user, row);
        else if (action === "restore") await restoreFromTrash(req, user, row);
        else await purgeFromTrash(req, user, row);
        results.push({ id, ok: true });
      } catch (err) {
        results.push({ id, ok: false, error: err instanceof Error ? err.message : "Gagal." });
      }
    }
    const done = results.filter((r) => r.ok).length;
    return NextResponse.json({ results, done, failed: results.length - done });
  });
}
