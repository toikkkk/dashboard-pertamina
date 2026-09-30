// New surface, not present in the original client-only PsiContextType: without
// this, the ~2,965 real files migrated but never promoted into a curated document
// would be invisible in the product entirely (present in R2/Postgres, unreachable
// from any UI). Admin-only browse/search over the raw file_registry ledger.
import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import type { AnyColumn, SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents, fileRegistry } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertRegionalAdmin } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";

const PAGE_SIZE = 50;
// Sentinel the frontend sends for the "(Tanpa sub-kategori)" bucket — files with no
// subfolder have pathSegments[1] = SQL NULL, which "= 'some string'" can never match
// (NULL isn't equal to anything, including itself), so it needs its own IS NULL branch.
const NO_SUBCATEGORY = "__none__";

// Allowlist mapping ?sortBy=... to a real column/expression — never interpolate the
// query param directly into SQL. `location` sorts by whichever of
// locationCanonical/locationRaw is set, matching what the table actually displays.
const SORT_COLUMNS: Record<string, SQL | AnyColumn> = {
  filename: fileRegistry.originalFilename,
  category: fileRegistry.category,
  location: sql`coalesce(${fileRegistry.locationCanonical}, ${fileRegistry.locationRaw})`,
  size: fileRegistry.sizeBytes,
  uploaded: fileRegistry.uploadedAt,
};

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertRegionalAdmin(user);

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    // "Sub-kategori" — the immediate subfolder under the chosen category (e.g. under
    // "02. PHA": Evidence / P&ID, PFD, Layout / Report PHA, MAH, SECE). Filtering by
    // category alone was flattening these together — a real client complaint, since
    // some categories nest 3+ levels deep before reaching an actual location. This
    // reads pathSegments[1] (already captured per-file by migrate.ts), so it works
    // for any category without hardcoding its folder names.
    const subcategory = searchParams.get("subcategory");
    const search = searchParams.get("search");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const sortColumn = SORT_COLUMNS[searchParams.get("sortBy") ?? ""] ?? fileRegistry.originalFilename;
    const sortDir = searchParams.get("sortDir") === "desc" ? desc : asc;

    // Berkas yang sudah ditautkan ke sebuah dokumen (sudah tampil di Direktori)
    // disembunyikan dari daftar ini — supaya arsip mentah dan Direktori tidak pernah
    // terlihat menampilkan dokumen yang sama dua kali di dua tempat berbeda.
    const conditions = [
      eq(fileRegistry.uploadStatus, "uploaded"),
      sql`${fileRegistry.id} not in (select ${documents.primaryFileId} from ${documents})`,
    ];
    if (category) conditions.push(eq(fileRegistry.category, category));
    if (subcategory === NO_SUBCATEGORY) {
      conditions.push(sql`${fileRegistry.pathSegments}->>1 IS NULL`);
    } else if (subcategory) {
      conditions.push(sql`${fileRegistry.pathSegments}->>1 = ${subcategory}`);
    }
    if (search) conditions.push(ilike(fileRegistry.originalFilename, `%${search}%`));

    const subcategoryQuery = category
      ? db
          .select({ sub: sql<string>`${fileRegistry.pathSegments}->>1`, count: sql<number>`count(*)::int` })
          .from(fileRegistry)
          .where(
            and(
              eq(fileRegistry.uploadStatus, "uploaded"),
              eq(fileRegistry.category, category),
              sql`${fileRegistry.id} not in (select ${documents.primaryFileId} from ${documents})`
            )
          )
          .groupBy(sql`${fileRegistry.pathSegments}->>1`)
          .orderBy(sql`count(*) desc`)
      : null;

    const [rows, [{ count }], subcategoryRows] = await Promise.all([
      db
        .select()
        .from(fileRegistry)
        .where(and(...conditions))
        // `id` as a secondary key makes pagination deterministic across requests —
        // without it, rows tied on the primary sort column (e.g. many files
        // uploaded the same second) could be ordered differently page to page,
        // causing a row to be skipped or repeated across the page boundary.
        .orderBy(sortDir(sortColumn), fileRegistry.id)
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(fileRegistry)
        .where(and(...conditions)),
      subcategoryQuery ?? Promise.resolve([]),
    ]);

    // A null subfolder means the file sits directly under the category with no
    // further nesting — surfaced as a distinct "(Tanpa sub-kategori)" bucket rather
    // than silently dropped, so the counts always add up to the category total.
    // `value` is what the frontend sends back as ?subcategory=... to select this
    // bucket; `label` is what it displays — they differ only for the null bucket.
    const subcategories = subcategoryRows.map((r) => ({
      value: r.sub ?? NO_SUBCATEGORY,
      label: r.sub ?? "(Tanpa sub-kategori)",
      count: r.count,
    }));

    return NextResponse.json({ items: rows, total: count, page, pageSize: PAGE_SIZE, subcategories });
  });
}
