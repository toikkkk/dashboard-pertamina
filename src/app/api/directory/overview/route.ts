// Ringkasan Direktori lintas lokasi (2026-10-07): per lokasi berapa dari 53 sub-dokumen Excel
// yang sudah terisi, dan status tiap sel (lokasi × sub-dokumen). Dipakai kartu lokasi
// (progres), matriks kepatuhan, dan chip "Belum ada dokumen". Baca saja — semua user yang
// sudah onboarded boleh (sama seperti Direktori lihat-saja lintas lokasi).
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { documentCategories, documents, locations } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertLocationRead } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";
import { categoryDocStatus, type CategoryDocStatus } from "@/lib/domain/documentCategories";
import { PSI_SUB_DOCUMENTS, psiSubDocumentByName } from "@/lib/domain/psiSubChapters";

export async function GET() {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertLocationRead(user);

    const [locs, cats, docs] = await Promise.all([
      db.select().from(locations),
      db.select().from(documentCategories),
      db.select({ categoryId: documents.categoryId, issueDate: documents.issueDate, location: documents.location }).from(documents),
    ]);

    // Dokumen terbaru + jumlah per kategori.
    const latest = new Map<string, string>();
    const count = new Map<string, number>();
    const docCount = new Map<string, number>();
    for (const d of docs) {
      docCount.set(d.location, (docCount.get(d.location) ?? 0) + 1);
      if (!d.categoryId) continue;
      count.set(d.categoryId, (count.get(d.categoryId) ?? 0) + 1);
      const cur = latest.get(d.categoryId);
      if (!cur || d.issueDate > cur) latest.set(d.categoryId, d.issueDate);
    }

    const cells: Record<string, Record<string, { id: string; n: number; s: CategoryDocStatus }>> = {};
    const progress = new Map<string, { filled: number; ok: number }>();
    for (const c of cats) {
      if (!psiSubDocumentByName(c.name)) continue; // hanya 53 item Excel
      const n = count.get(c.id) ?? 0;
      const s = categoryDocStatus(c, latest.has(c.id) ? { issueDate: latest.get(c.id)! } : null);
      (cells[c.location] ??= {})[c.name] = { id: c.id, n, s };
      const p = progress.get(c.location) ?? { filled: 0, ok: 0 };
      if (n > 0) p.filled += 1;
      if (s === "ok") p.ok += 1;
      progress.set(c.location, p);
    }

    return NextResponse.json({
      total: PSI_SUB_DOCUMENTS.length,
      locations: locs
        .map((l) => ({
          name: l.name,
          type: l.locationType,
          docCount: docCount.get(l.name) ?? 0,
          filled: progress.get(l.name)?.filled ?? 0,
          ok: progress.get(l.name)?.ok ?? 0,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      items: PSI_SUB_DOCUMENTS.map((s) => ({ name: s.name, chapter: s.chapter, no: s.no })),
      cells,
    });
  });
}
