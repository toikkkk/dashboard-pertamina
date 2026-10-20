// Tahap H Penutupan, langkah 2: Controller memfinalisasi penutupan dengan mengunggah Form Tinjauan Akhir & Penutupan
// (Lampiran 7) yang sudah bertanda tangan lengkap. Setelah itu status Register menjadi Closed.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mocRequests } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { attachMocEvidence, loadMocItem, recordMocHistory, requireMocAction } from "@/lib/api/moc";
import { CLOSURE_EVIDENCE_STAGE, type MocClosure } from "@/lib/domain/moc";

const bodySchema = z.object({ fileId: z.string().uuid() });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const moc = await requireMocAction(params.id, user, "finalizeClosure");
    const { fileId } = bodySchema.parse(await req.json());
    if (!moc.closure) throw new HttpError(409, "Penutupan belum disetujui Approver.");

    const ok = await attachMocEvidence(moc.id, "controller", fileId, user, undefined, CLOSURE_EVIDENCE_STAGE);
    if (!ok) throw new HttpError(400, "Berkas tidak valid atau bukan unggahan Anda.");

    const closure: MocClosure = { ...moc.closure, finalizedAt: new Date().toISOString(), finalizedByName: user.name };
    await db.update(mocRequests).set({ closure, registerStatus: "Closed", updatedAt: new Date() }).where(eq(mocRequests.id, moc.id));
    await recordMocHistory(moc.id, user, "Ditutup", {
      notes: "Form Tinjauan Akhir & Penutupan bertanda tangan diunggah. MOC ditutup.",
      fromState: moc.registerStatus,
      toState: "Closed",
    });
    return NextResponse.json(await loadMocItem(moc.id));
  });
}
