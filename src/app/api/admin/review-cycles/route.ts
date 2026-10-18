// Atur siklus tinjau per sub-dokumen (Admin Regional). Siklus (bulan) menentukan masa berlaku dokumen baru dan
// pengunggahan ulang: tanggal berlaku = tanggal terbit + siklus. Mengubah siklus berlaku untuk sub-dokumen dengan
// nama itu di SEMUA lokasi. Dokumen yang sudah ada hanya dihitung ulang bila diminta (recalc); perubahan dicatat
// di Riwayat tiap dokumen ("Dikoreksi:", bukan pembaruan isi) dan di Log Aktivitas.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documentCategories, documents, historyDiffs, historyItems } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertRegionalAdmin } from "@/lib/auth/rbac";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { logAudit } from "@/lib/audit";
import { psiSortKey, psiSubDocumentByName } from "@/lib/domain/psiSubChapters";

const addMonthsIso = (iso: string, months: number): string => {
  const d = new Date(`${iso}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export async function GET() {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertRegionalAdmin(user);
    const cats = await db.select({ id: documentCategories.id, name: documentCategories.name, months: documentCategories.reviewCycleMonths, isCustom: documentCategories.isCustom }).from(documentCategories);
    const docCounts = await db
      .select({ categoryId: documents.categoryId, n: sql<number>`count(*)::int` })
      .from(documents)
      .where(isNull(documents.deletedAt))
      .groupBy(documents.categoryId);
    const nByCat = new Map(docCounts.map((r) => [r.categoryId, r.n]));
    const byName = new Map<string, { name: string; months: Set<number>; locations: number; docs: number; isCustom: boolean }>();
    for (const c of cats) {
      const g = byName.get(c.name) ?? { name: c.name, months: new Set<number>(), locations: 0, docs: 0, isCustom: c.isCustom };
      g.months.add(c.months);
      g.locations += 1;
      g.docs += nByCat.get(c.id) ?? 0;
      byName.set(c.name, g);
    }
    const items = Array.from(byName.values())
      .map((g) => {
        const ex = psiSubDocumentByName(g.name);
        return { name: g.name, chapter: ex?.chapter ?? null, no: ex?.no ?? null, months: Array.from(g.months).sort((a, b) => a - b), locations: g.locations, docs: g.docs, isCustom: g.isCustom };
      })
      .sort((a, b) => psiSortKey(a.name) - psiSortKey(b.name) || a.name.localeCompare(b.name));
    return NextResponse.json({ items });
  });
}

const bodySchema = z.object({
  name: z.string().trim().min(1).max(300),
  months: z.number().int().min(1).max(600),
  recalc: z.boolean().default(false),
  dryRun: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertRegionalAdmin(user);
    const { name, months, recalc, dryRun } = bodySchema.parse(await req.json());

    const cats = await db.select({ id: documentCategories.id, months: documentCategories.reviewCycleMonths }).from(documentCategories).where(eq(documentCategories.name, name));
    if (cats.length === 0) throw new HttpError(404, "Sub-dokumen tidak ditemukan.");
    const catIds = cats.map((c) => c.id);
    const oldMonths = Array.from(new Set(cats.map((c) => c.months))).sort((a, b) => a - b);

    // Dokumen yang tanggal berlakunya berubah bila dihitung ulang.
    const docs = recalc
      ? await db
          .select({ id: documents.id, issueDate: documents.issueDate, expiryDate: documents.expiryDate, status: documents.status, location: documents.location, fileId: documents.primaryFileId, version: documents.currentVersion })
          .from(documents)
          .where(and(inArray(documents.categoryId, catIds), isNull(documents.deletedAt)))
      : [];
    const changes = docs.map((d) => ({ ...d, newExpiry: addMonthsIso(d.issueDate, months) })).filter((d) => d.newExpiry !== d.expiryDate);

    if (dryRun) return NextResponse.json({ dryRun: true, categories: cats.length, oldMonths, docsAffected: changes.length });

    await db.update(documentCategories).set({ reviewCycleMonths: months }).where(eq(documentCategories.name, name));

    const today = new Date().toISOString().split("T")[0];
    for (let i = 0; i < changes.length; i += 150) {
      const chunk = changes.slice(i, i + 150);
      const ids = chunk.map((c) => c.id);
      const whens = sql.join(chunk.map((c) => sql`when ${documents.id} = ${c.id} then ${c.newExpiry}::date`), sql` `);
      await db
        .update(documents)
        .set({ expiryDate: sql`case ${whens} else ${documents.expiryDate} end`, updatedAt: new Date() })
        .where(inArray(documents.id, ids));
      const hist = await db
        .insert(historyItems)
        .values(
          chunk.map((c) => ({
            documentId: c.id,
            actorName: user.name,
            actorRole: user.role,
            location: c.location,
            action: "Revised" as const,
            notes: `Dikoreksi: siklus tinjau sub-dokumen diubah menjadi ${months} bulan, tanggal berlaku dihitung ulang`,
            fileId: c.fileId,
            version: c.version,
          }))
        )
        .returning({ id: historyItems.id, documentId: historyItems.documentId });
      const byDoc = new Map(hist.map((h) => [h.documentId, h.id]));
      await db.insert(historyDiffs).values(chunk.map((c) => ({ historyItemId: byDoc.get(c.id)!, field: "Tanggal Kedaluwarsa", oldValue: c.expiryDate, newValue: c.newExpiry })));
      // Dokumen yang tadinya berstatus Expired tetapi kini masih berlaku kembali Approved.
      const revive = chunk.filter((c) => c.status === "Expired" && c.newExpiry >= today).map((c) => c.id);
      if (revive.length > 0) await db.update(documents).set({ status: "Approved" }).where(inArray(documents.id, revive));
    }

    await logAudit(req, { id: user.id, name: user.name, email: user.email }, "siklus.diubah", {
      targetType: "sub-dokumen",
      targetLabel: name,
      detail: { dari: oldMonths, ke: months, lokasi: cats.length, dokumenDihitungUlang: changes.length },
    });
    return NextResponse.json({ dryRun: false, categories: cats.length, oldMonths, newMonths: months, docsAffected: changes.length });
  });
}
