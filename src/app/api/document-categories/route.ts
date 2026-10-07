// Grid Direktori per lokasi (2026-09-28) — daftar sub-kategori dokumen + status
// ✅/❌/🟡 terhadap dokumen TERBARU di kategori itu. Baca: siapa pun yang sudah
// onboarded (lihat-saja lintas lokasi, sama seperti Direktori lama). Buat kategori
// baru: hak TULIS lokasi itu (sama seperti unggah dokumen), bukan admin-only —
// lihat catatan RBAC di CLAUDE.md soal baca-vs-tulis.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documentCategories, documents, locations } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertLocationRead, assertLocationWrite } from "@/lib/auth/rbac";
import { withErrorHandling, HttpError } from "@/lib/api/respond";
import { categoryDocStatus } from "@/lib/domain/documentCategories";
import { psiSortKey, psiSubDocumentByName } from "@/lib/domain/psiSubChapters";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertLocationRead(user);

    const location = new URL(req.url).searchParams.get("location");
    if (!location) return NextResponse.json({ error: "Parameter location wajib diisi." }, { status: 400 });

    const [cats, docs] = await Promise.all([
      db.select().from(documentCategories).where(eq(documentCategories.location, location)).orderBy(documentCategories.createdAt),
      db
        .select({ id: documents.id, title: documents.title, categoryId: documents.categoryId, issueDate: documents.issueDate, currentVersion: documents.currentVersion, documentNumber: documents.documentNumber, status: documents.status, expiryDate: documents.expiryDate })
        .from(documents)
        .where(and(eq(documents.location, location))),
    ]);

    // Satu kategori bisa punya LEBIH dari satu dokumen (mis. "SDS Produk BBM/BBK/LPG"
    // wajar mencakup beberapa produk berbeda) — status/kedaluwarsa tetap dihitung dari
    // yang TERBARU (issueDate), tapi daftar lengkapnya juga dikirim supaya klien tidak
    // langsung lompat ke satu dokumen kalau sebenarnya ada lebih dari satu (celah yang
    // sempat ditemukan: dulu ubin kategori diam-diam "menelan" dokumen selain yang
    // terbaru, tak terlihat & tak terjangkau dari Direktori).
    const byCategory = new Map<string, (typeof docs)[number][]>();
    for (const d of docs) {
      if (!d.categoryId) continue;
      const list = byCategory.get(d.categoryId) ?? [];
      list.push(d);
      byCategory.set(d.categoryId, list);
    }
    for (const list of Array.from(byCategory.values())) list.sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1));

    const items = cats.map((c) => {
      const list = byCategory.get(c.id) ?? [];
      const doc = list[0] ?? null;
      const excel = psiSubDocumentByName(c.name);
      return {
        id: c.id,
        name: c.name,
        // Posisi di Excel client (cluster + nomor urut + keterangan); null = di luar Excel.
        chapter: excel?.chapter ?? null,
        no: excel?.no ?? null,
        keterangan: excel?.keterangan ?? null,
        reviewCycleMonths: c.reviewCycleMonths,
        treatExpiryAsReviewOnly: c.treatExpiryAsReviewOnly,
        isCustom: c.isCustom,
        status: categoryDocStatus(c, doc),
        document: doc ? { id: doc.id, title: doc.title, version: doc.currentVersion, issueDate: doc.issueDate } : null,
        documents: list.map((d) => ({ id: d.id, title: d.title, version: d.currentVersion, issueDate: d.issueDate, documentNumber: d.documentNumber, status: d.status, expiryDate: d.expiryDate })),
      };
    });
    items.sort((a, b) => psiSortKey(a.name) - psiSortKey(b.name) || a.name.localeCompare(b.name));

    return NextResponse.json({ location, categories: items });
  });
}

const createSchema = z.object({
  location: z.string().trim().min(1),
  name: z.string().trim().min(1).max(150),
});

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const { location, name } = createSchema.parse(await req.json());
    assertLocationWrite(user, location);

    const [loc] = await db.select({ name: locations.name }).from(locations).where(eq(locations.name, location)).limit(1);
    if (!loc) return NextResponse.json({ error: "Lokasi tidak valid." }, { status: 400 });

    const [existing] = await db
      .select({ id: documentCategories.id })
      .from(documentCategories)
      .where(and(eq(documentCategories.location, location), eq(documentCategories.name, name)))
      .limit(1);
    if (existing) throw new HttpError(409, "Sub-kategori dengan nama itu sudah ada di lokasi ini.");

    const [created] = await db
      .insert(documentCategories)
      .values({ location, name, isCustom: true, createdBy: user.id })
      .returning();

    return NextResponse.json(
      { id: created.id, name: created.name, chapter: null, no: null, keterangan: null, reviewCycleMonths: created.reviewCycleMonths, treatExpiryAsReviewOnly: created.treatExpiryAsReviewOnly, isCustom: created.isCustom, status: "missing", document: null, documents: [] },
      { status: 201 }
    );
  });
}
