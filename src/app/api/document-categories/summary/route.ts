// Ringkasan sub-kategori PSI LINTAS SEMUA LOKASI (2026-09-29) — dipakai tab
// "Per jenis PSI" di kartu Kepatuhan Dokumen dashboard. Sebelum ini tab itu masih
// pakai 4 psi_type lama + target manual dari location_targets (cuma diisi untuk 5
// lokasi asli). Sekarang berbasis 33 sub-kategori PSI First Column yang sudah jadi
// dasar Direktori — "target" per kategori = jumlah lokasi yang punya kategori itu
// (bukan angka target manual, karena document_categories tidak punya kolom target),
// "approved" = jumlah lokasi yang status kategorinya 'ok' (ada dokumen & masih
// berlaku). Baca saja, semua user yang sudah onboarded boleh lihat (sama seperti
// Direktori lihat-saja lintas lokasi).
import { NextResponse } from "next/server";
import { isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documentCategories, documents } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertLocationRead } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";
import { categoryDocStatus } from "@/lib/domain/documentCategories";

export async function GET() {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertLocationRead(user);

    const [cats, docs] = await Promise.all([
      db.select().from(documentCategories),
      db.select({ categoryId: documents.categoryId, issueDate: documents.issueDate }).from(documents).where(isNull(documents.deletedAt)),
    ]);

    const latestByCategory = new Map<string, { issueDate: string }>();
    for (const d of docs) {
      if (!d.categoryId) continue;
      const current = latestByCategory.get(d.categoryId);
      if (!current || d.issueDate > current.issueDate) latestByCategory.set(d.categoryId, { issueDate: d.issueDate });
    }

    // Sub-kategori buatan sendiri (isCustom: "Other", dst.) bukan persyaratan baku, jadi
    // tidak masuk hitungan kepatuhan — hanya 33 sub-kategori PSI First Column.
    const byName = new Map<string, { approved: number; target: number }>();
    const byLocation = new Map<string, { approved: number; target: number }>();
    for (const c of cats) {
      if (c.isCustom) continue;
      const status = categoryDocStatus(c, latestByCategory.get(c.id) ?? null);
      const bucket = byName.get(c.name) ?? { approved: 0, target: 0 };
      bucket.target += 1;
      if (status === "ok") bucket.approved += 1;
      byName.set(c.name, bucket);
      const lb = byLocation.get(c.location) ?? { approved: 0, target: 0 };
      lb.target += 1;
      if (status === "ok") lb.approved += 1;
      byLocation.set(c.location, lb);
    }

    const items = Array.from(byName.entries()).map(([name, v]) => ({
      name,
      approved: v.approved,
      target: v.target,
      pct: v.target > 0 ? Math.min(100, Math.round((v.approved / v.target) * 100)) : 0,
    }));

    const locations = Array.from(byLocation.entries()).map(([location, v]) => ({
      location,
      approved: v.approved,
      target: v.target,
      pct: v.target > 0 ? Math.min(100, Math.round((v.approved / v.target) * 100)) : 0,
    }));

    return NextResponse.json({ categories: items, locations });
  });
}
