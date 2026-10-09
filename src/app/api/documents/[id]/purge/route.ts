// Hapus PERMANEN sekarang untuk dokumen yang sudah ada di Sampah (tanpa menunggu 30 hari). Hanya dokumen yang
// sudah di Sampah — dokumen aktif harus dipindah ke Sampah dulu. Tak terbalik (kecuali dari cadangan).
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { ForbiddenError } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";
import { purgeDocumentRow } from "@/lib/api/trash";
import { canDeleteDocument } from "@/lib/domain/rules";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const [docRow] = await db.select().from(documents).where(eq(documents.id, params.id)).limit(1);
    if (!docRow || !docRow.deletedAt) return NextResponse.json({ error: "Dokumen tidak ada di Sampah." }, { status: 404 });
    if (!canDeleteDocument(user, docRow.location)) {
      throw new ForbiddenError("Hanya Admin Regional atau Controller PSI lokasi ini yang dapat menghapus permanen dokumen.");
    }

    const { filesRemoved, filesTotal } = await purgeDocumentRow(docRow);
    await logAudit(req, { id: user.id, name: user.name, email: user.email }, "dokumen.dihapus_permanen", {
      targetType: "dokumen",
      targetId: docRow.id,
      targetLabel: `${docRow.documentNumber} ${docRow.title}`,
      location: docRow.location,
      detail: { versi: docRow.currentVersion, berkasDihapus: filesRemoved, berkasTotal: filesTotal, dihapusDariSampah: docRow.deletedAt.toISOString() },
    });
    return NextResponse.json({ ok: true, filesRemoved });
  });
}
