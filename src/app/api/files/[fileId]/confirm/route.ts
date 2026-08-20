// Step 2 of the upload flow: the browser calls this once its direct PUT to R2 (from
// the presigned URL) succeeds, flipping the file_registry row from 'pending' to
// 'uploaded'. Only the uploader may confirm their own pending row.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { fileRegistry } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { ForbiddenError } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";

const bodySchema = z.object({ checksumSha256: z.string().optional() });

export async function POST(req: NextRequest, { params }: { params: { fileId: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const { checksumSha256 } = bodySchema.parse(await req.json().catch(() => ({})));

    const [file] = await db.select().from(fileRegistry).where(eq(fileRegistry.id, params.fileId)).limit(1);
    if (!file) return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 404 });
    if (file.uploadedByUserId !== user.id) {
      throw new ForbiddenError("Anda tidak dapat mengonfirmasi unggahan milik user lain.");
    }

    const [updated] = await db
      .update(fileRegistry)
      .set({ uploadStatus: "uploaded", uploadedAt: new Date(), checksumSha256: checksumSha256 ?? file.checksumSha256 })
      .where(eq(fileRegistry.id, params.fileId))
      .returning();

    return NextResponse.json({ id: updated.id, uploadStatus: updated.uploadStatus });
  });
}
