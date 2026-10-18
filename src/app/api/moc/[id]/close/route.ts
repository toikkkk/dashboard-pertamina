// Tahap H Penutupan: MoC Approver (berakun) menutup MOC, atau Controller atas nama Approver
// tanpa akun (closeProxy). Syarat: Tinjauan Akhir sudah dicatat (ditegakkan mocActionsFor).
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mocRequests } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { attachStageFiles, loadMocItem, mocCloseSchema, recordMocHistory, requireMocAction, sessionUserToMocActor } from "@/lib/api/moc";
import { mocActionsFor, type MocClosure } from "@/lib/domain/moc";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const { note, evidenceFileId } = mocCloseSchema.parse(await req.json());
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
    await db.update(mocRequests).set({ closure, registerStatus: "Closed", updatedAt: new Date() }).where(eq(mocRequests.id, moc.id));
    await recordMocHistory(moc.id, user, "Ditutup", {
      notes: `${proxy ? `Dicatat Controller atas nama Approver ${closure.onBehalfOf ?? ""}. ` : ""}${note}`.trim(),
      fromState: moc.registerStatus,
      toState: "Closed",
    });
    if (evidenceFileId) await attachStageFiles(moc.id, [evidenceFileId], user, "Penutupan");
    return NextResponse.json(await loadMocItem(moc.id));
  });
}
