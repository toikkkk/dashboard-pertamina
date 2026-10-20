// Tahap H Penutupan, langkah 1: MoC Approver (berakun) menyetujui penutupan MOC setelah semua Reviewer Sesuai, atau
// Controller atas nama Approver tanpa akun (closeProxy). MOC BELUM Closed: Controller memfinalisasi dengan mengunggah
// form penutupan bertanda tangan (close/finalize).
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mocRequests } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { loadMocItem, mocCloseSchema, recordMocHistory, requireMocAction, sessionUserToMocActor } from "@/lib/api/moc";
import { mocActionsFor, type MocClosure } from "@/lib/domain/moc";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const { note } = mocCloseSchema.parse(await req.json());
    const loaded = await loadMocItem(params.id);
    if (!loaded) throw new HttpError(404, "MOC tidak ditemukan.");
    const allowed = mocActionsFor(loaded, sessionUserToMocActor(user));
    const proxy = !allowed.includes("close") && allowed.includes("closeProxy");
    const moc = await requireMocAction(params.id, user, proxy ? "closeProxy" : "close");

    const closure: MocClosure = {
      note,
      closedAt: new Date().toISOString(),
      closedById: user.id,
      closedByName: user.name,
      onBehalfOf: proxy ? moc.approverManualName ?? moc.approverName ?? null : null,
    };
    await db.update(mocRequests).set({ closure, updatedAt: new Date() }).where(eq(mocRequests.id, moc.id));
    await recordMocHistory(moc.id, user, "Penutupan Disetujui", {
      notes: `${proxy ? `Dicatat Controller atas nama Approver ${closure.onBehalfOf ?? ""}. ` : ""}${note} Menunggu Controller mengunggah form penutupan bertanda tangan.`.trim(),
    });
    return NextResponse.json(await loadMocItem(moc.id));
  });
}
