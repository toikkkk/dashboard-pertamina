// Tahap E langkah 1 (TKO V-E.1): Initiator (atau Controller lokasi atas namanya) mencatat
// rencana implementasi untuk MoC Performer. Hanya setelah Komunikasi dicatat (mocActionsFor).
// Boleh dicatat ulang selama Implementasi belum dimulai (menimpa; tiap simpan masuk Riwayat).
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mocRequests } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { attachStageFiles, loadMocItem, mocImplementationPlanSchema, recordMocHistory, requireMocAction } from "@/lib/api/moc";
import { mocImplementationPlanIssues, type MocImplementationPlan } from "@/lib/domain/moc";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const moc = await requireMocAction(params.id, user, "planImplementation");
    const { attachmentFileIds, ...input } = mocImplementationPlanSchema.parse(await req.json());

    // Baris milestone kosong dari formulir dibuang sebelum dicek & disimpan.
    const milestones = input.milestones.filter((m) => m.label.trim() || m.targetDate);
    const issues = mocImplementationPlanIssues({ ...input, milestones });
    if (issues.length > 0) throw new HttpError(400, "Rencana implementasi belum lengkap.", { issues });

    const record: MocImplementationPlan = { ...input, milestones, recordedById: user.id, recordedByName: user.name, recordedAt: new Date().toISOString() };
    await db.update(mocRequests).set({ implementationPlan: record, updatedAt: new Date() }).where(eq(mocRequests.id, moc.id));
    await recordMocHistory(moc.id, user, "Rencana Implementasi Dicatat", {
      notes: `${moc.implementationPlan ? "Diperbarui. " : ""}${milestones.length} milestone, untuk ${moc.performerName ?? "MoC Performer"}.`,
    });
    await attachStageFiles(moc.id, attachmentFileIds, user, "Rencana Implementasi");

    return NextResponse.json(await loadMocItem(moc.id));
  });
}
