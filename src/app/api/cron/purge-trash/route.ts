// Tugas terjadwal harian (vercel.json → crons): hapus PERMANEN dokumen yang sudah > TRASH_RETENTION_DAYS di Sampah.
// Vercel mengirim "Authorization: Bearer $CRON_SECRET". Tanpa CRON_SECRET terpasang route menolak semua panggilan
// (aman secara bawaan) — pasang CRON_SECRET di Vercel sebelum mengandalkan penghapusan otomatis.
import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, isNotNull, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { withErrorHandling } from "@/lib/api/respond";
import { purgeDocumentRow } from "@/lib/api/trash";
import { TRASH_RETENTION_DAYS } from "@/lib/domain/trash";
import { logAudit } from "@/lib/audit";

// Satu putaran dibatasi supaya tidak melewati batas waktu fungsi; sisanya diambil putaran berikutnya (besok).
const MAX_PER_RUN = 25;

function authorized(req: NextRequest): boolean | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null; // belum dikonfigurasi
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const ok = authorized(req);
    if (ok === null) return NextResponse.json({ error: "CRON_SECRET belum dikonfigurasi." }, { status: 503 });
    if (!ok) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });

    const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const due = await db
      .select()
      .from(documents)
      .where(and(isNotNull(documents.deletedAt), lt(documents.deletedAt, cutoff)))
      .limit(MAX_PER_RUN);

    let purged = 0;
    for (const docRow of due) {
      try {
        const { filesRemoved, filesTotal } = await purgeDocumentRow(docRow);
        purged += 1;
        await logAudit(req, { name: "Sistem (hapus otomatis 30 hari)" }, "dokumen.dihapus_permanen", {
          targetType: "dokumen",
          targetId: docRow.id,
          targetLabel: `${docRow.documentNumber} ${docRow.title}`,
          location: docRow.location,
          detail: { otomatis: true, berkasDihapus: filesRemoved, berkasTotal: filesTotal, dihapusDariSampah: docRow.deletedAt?.toISOString() },
        });
      } catch (err) {
        console.error("[cron purge-trash] gagal", docRow.id, err instanceof Error ? err.message : err);
      }
    }
    return NextResponse.json({ checked: due.length, purged });
  });
}
