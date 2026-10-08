// Pindahkan banyak dokumen ke satu sub-dokumen (kategori) lain di lokasi yang SAMA.
// Hak TULIS lokasi itu (sama dengan PATCH satu dokumen); lintas lokasi ditolak. Riwayat dicatat
// persis seperti PATCH (aksi "Revised" + selisih "Sub-kategori") sehingga dashboard tidak
// menghitungnya sebagai pembaruan nyata (lihat isRealUpdate di domain/dashboard.ts).
import { logAudit } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents, documentCategories, historyItems, historyDiffs } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertLocationWrite } from "@/lib/auth/rbac";
import { withErrorHandling, HttpError } from "@/lib/api/respond";

const bodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  categoryId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const { ids, categoryId } = bodySchema.parse(await req.json());
    const uniqueIds = Array.from(new Set(ids));

    const docs = await db.select().from(documents).where(inArray(documents.id, uniqueIds));
    if (docs.length !== uniqueIds.length) throw new HttpError(404, "Sebagian dokumen tidak ditemukan.");
    const location = docs[0].location;
    if (docs.some((d) => d.location !== location)) throw new HttpError(400, "Dokumen harus berasal dari lokasi yang sama.");
    assertLocationWrite(user, location);

    const cats = await db
      .select({ id: documentCategories.id, name: documentCategories.name })
      .from(documentCategories)
      .where(eq(documentCategories.location, location));
    const target = cats.find((c) => c.id === categoryId);
    if (!target) throw new HttpError(404, "Sub-dokumen tujuan tidak ditemukan di lokasi ini.");
    const nameById = new Map(cats.map((c) => [c.id, c.name]));

    const toMove = docs.filter((d) => d.categoryId !== categoryId);
    if (toMove.length > 0) {
      await db
        .update(documents)
        .set({ categoryId, updatedAt: new Date() })
        .where(and(inArray(documents.id, toMove.map((d) => d.id)), eq(documents.location, location)));

      const histories = await db
        .insert(historyItems)
        .values(
          toMove.map((d) => ({
            documentId: d.id,
            actorName: user.name,
            actorRole: user.role,
            location,
            action: "Revised" as const,
            notes: "Pembaruan sub-kategori dokumen",
            fileId: d.primaryFileId,
            version: d.currentVersion,
          }))
        )
        .returning({ id: historyItems.id, documentId: historyItems.documentId });
      const histByDoc = new Map(histories.map((h) => [h.documentId, h.id]));
      await db.insert(historyDiffs).values(
        toMove.map((d) => ({
          historyItemId: histByDoc.get(d.id)!,
          field: "Sub-kategori",
          oldValue: (d.categoryId && nameById.get(d.categoryId)) || "(tanpa kategori)",
          newValue: target.name,
        }))
      );
    }

    if (toMove.length > 0) await logAudit(req, { id: user.id, name: user.name, email: user.email }, "dokumen.dipindah", { targetType: "sub-dokumen", targetId: categoryId, targetLabel: target.name, location, detail: { jumlah: toMove.length, dokumen: toMove.slice(0, 50).map((d) => d.id) } });
    return NextResponse.json({ moved: toMove.length, skipped: docs.length - toMove.length, categoryName: target.name });
  });
}
