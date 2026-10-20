// Reviewer menanggapi Tinjauan Akhir: Sesuai atau Perlu Perubahan. Reviewer berakun menanggapi sendiri; tanggapan
// Reviewer tanpa akun dicatat Initiator atau Controller atas namanya (index menunjuk barisnya).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mocRequests } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { loadMocItem, recordMocHistory, requireMocAction, sessionUserToMocActor } from "@/lib/api/moc";
import { mocActionsFor, type MocFinalReview } from "@/lib/domain/moc";

const bodySchema = z.object({ outcome: z.enum(["Sesuai", "Perlu Perubahan"]), note: z.string().trim().max(3000).default(""), index: z.number().int().min(0).optional() });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const { outcome, note, index } = bodySchema.parse(await req.json());
    if (outcome === "Perlu Perubahan" && !note) throw new HttpError(400, "Catatan wajib diisi bila meminta perubahan.");
    const loaded = await loadMocItem(params.id);
    if (!loaded) throw new HttpError(404, "MOC tidak ditemukan.");
    const allowed = mocActionsFor(loaded, sessionUserToMocActor(user));
    const own = allowed.includes("reviewFinal");
    const moc = await requireMocAction(params.id, user, own ? "reviewFinal" : "reviewFinalProxy");
    const fr = moc.finalReview;
    if (!fr) throw new HttpError(409, "Tinjauan Akhir belum dicatat.");
    const responses = [...(fr.responses ?? [])];

    let i = -1;
    if (own) i = responses.findIndex((r) => r.outcome === "Pending" && r.userId === user.id);
    else if (index !== undefined && responses[index] && !responses[index].userId && responses[index].outcome === "Pending") i = index;
    if (i < 0) throw new HttpError(400, "Tanggapan Reviewer yang dimaksud tidak ditemukan atau sudah diisi.");

    responses[i] = { ...responses[i], outcome, note, at: new Date().toISOString(), ...(own ? {} : { byName: user.name }) };
    const next: MocFinalReview = { ...fr, responses };
    await db.update(mocRequests).set({ finalReview: next, updatedAt: new Date() }).where(eq(mocRequests.id, moc.id));
    await recordMocHistory(moc.id, user, "Review Tinjauan Akhir", {
      notes: `${responses[i].fungsi}${own ? "" : ` (dicatat ${user.name} atas nama ${responses[i].name})`}: ${outcome}.${note ? ` ${note}` : ""}`,
    });
    return NextResponse.json(await loadMocItem(moc.id));
  });
}
