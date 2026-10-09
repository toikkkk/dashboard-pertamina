// Hapus PERMANEN sekarang untuk dokumen yang sudah ada di Sampah (tanpa menunggu 30 hari). Hanya dokumen yang
// sudah di Sampah — dokumen aktif harus dipindah ke Sampah dulu. Tak terbalik (kecuali dari cadangan).
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api/respond";
import { purgeFromTrash } from "@/lib/api/trash";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const [docRow] = await db.select().from(documents).where(eq(documents.id, params.id)).limit(1);
    if (!docRow) return NextResponse.json({ error: "Dokumen tidak ada di Sampah." }, { status: 404 });
    const { filesRemoved } = await purgeFromTrash(req, user, docRow);
    return NextResponse.json({ ok: true, filesRemoved });
  });
}
