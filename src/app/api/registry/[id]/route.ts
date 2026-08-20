import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { fileRegistry } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertRegionalAdmin } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertRegionalAdmin(user);

    const [file] = await db.select().from(fileRegistry).where(eq(fileRegistry.id, params.id)).limit(1);
    if (!file) return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 404 });

    return NextResponse.json({ ...file, downloadUrl: `/api/files/${file.id}/download` });
  });
}
