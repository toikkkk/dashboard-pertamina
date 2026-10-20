// Initiator melanjutkan kembali MOC yang ditunda/dihentikan: MOC kembali ke Inisiasi & Validasi (status "returned") dan
// harus mengulang Penilaian Risiko lalu Validasi. Komunikasi, rencana implementasi, tinjauan akhir, dan penutupan
// direset; riwayat pemantauan, bukti, dan Nomor MoC dipertahankan.
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mocRequests } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api/respond";
import { loadMocItem, recordMocHistory, requireMocAction } from "@/lib/api/moc";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const moc = await requireMocAction(params.id, user, "resume");
    await db
      .update(mocRequests)
      .set({ validationState: "returned", registerStatus: "Inisiasi & Validasi", communication: null, implementationPlan: null, finalReview: null, closure: null, updatedAt: new Date() })
      .where(eq(mocRequests.id, moc.id));
    await recordMocHistory(moc.id, user, "Dilanjutkan Kembali", {
      notes: "MOC dilanjutkan kembali: ulangi Penilaian Risiko lalu ajukan ke Validasi.",
      fromState: moc.validationState,
      toState: "returned",
    });
    return NextResponse.json(await loadMocItem(moc.id));
  });
}
