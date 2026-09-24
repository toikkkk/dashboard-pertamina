// SEMENTARA: memajukan status Register (Implementasi -> Pemantauan -> Tinjauan Akhir ->
// Closed) dengan catatan. Alur tahap D-H di TKO belum jelas (menunggu user), jadi ini
// hanya penanda tahap — BUKAN logika final. Hanya Controller lokasi.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mocRequests } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { loadMocItem, recordMocHistory, requireMocAction } from "@/lib/api/moc";
import { nextRegisterStatus } from "@/lib/domain/moc";

const bodySchema = z.object({ notes: z.string().trim().max(2000).default("") });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const moc = await requireMocAction(params.id, user, "advance");
    const { notes } = bodySchema.parse(await req.json().catch(() => ({})));

    if (!notes) throw new HttpError(400, "Catatan wajib diisi.");

    const next = nextRegisterStatus(moc.registerStatus);
    if (!next) throw new HttpError(409, "MOC sudah berstatus akhir.");

    await db.update(mocRequests).set({ registerStatus: next, updatedAt: new Date() }).where(eq(mocRequests.id, moc.id));
    await recordMocHistory(moc.id, user, "Tahap Dimajukan", {
      notes: `${moc.registerStatus} → ${next}.${notes ? ` ${notes}` : ""}`,
      fromState: moc.registerStatus,
      toState: next,
    });
    return NextResponse.json(await loadMocItem(moc.id));
  });
}
