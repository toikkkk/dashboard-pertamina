// New surface, not present in the original client-only PsiContextType: without
// this, the ~2,965 real files migrated but never promoted into a curated document
// would be invisible in the product entirely (present in R2/Postgres, unreachable
// from any UI). Admin-only browse/search over the raw file_registry ledger.
import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { fileRegistry } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertRegionalAdmin } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertRegionalAdmin(user);

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

    const conditions = [eq(fileRegistry.uploadStatus, "uploaded")];
    if (category) conditions.push(eq(fileRegistry.category, category));
    if (search) conditions.push(ilike(fileRegistry.originalFilename, `%${search}%`));

    const [rows, [{ count }]] = await Promise.all([
      db
        .select()
        .from(fileRegistry)
        .where(and(...conditions))
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(fileRegistry)
        .where(and(...conditions)),
    ]);

    return NextResponse.json({ items: rows, total: count, page, pageSize: PAGE_SIZE });
  });
}
