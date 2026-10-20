// Initiator mengajukan penundaan atau penghentian MOC saat Pemantauan ke Approver.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mocRequests } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api/respond";
import { loadMocItem, recordMocHistory, requireMocAction } from "@/lib/api/moc";
import type { MocHalt } from "@/lib/domain/moc";

const bodySchema = z.object({ kind: z.enum(["Tunda", "Hentikan"]), reason: z.string().trim().min(5, "Alasan wajib diisi.").max(3000) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const moc = await requireMocAction(params.id, user, "requestHalt");
    const { kind, reason } = bodySchema.parse(await req.json());
    const halt: MocHalt = {
      kind,
      reason,
      requestedById: user.id,
      requestedByName: user.name,
      requestedAt: new Date().toISOString(),
      decision: null,
      decisionNote: "",
      decidedByName: null,
      decidedAt: null,
      onBehalfOf: null,
    };
    await db.update(mocRequests).set({ halt, validationState: "halt_requested", updatedAt: new Date() }).where(eq(mocRequests.id, moc.id));
    await recordMocHistory(moc.id, user, "Penundaan/Penghentian Diajukan", {
      notes: `${kind === "Hentikan" ? "Penghentian" : "Penundaan"} diajukan ke Approver. ${reason}`,
      fromState: moc.validationState,
      toState: "halt_requested",
    });
    return NextResponse.json(await loadMocItem(moc.id));
  });
}
