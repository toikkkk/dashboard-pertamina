// Tahap F Pemantauan (Lampiran 6): pembuat MOC, MoC Performer, atau Controller mencatat satu
// pemantauan (Pemantauan Ke-N). Hasilnya: Lanjut (tetap di Pemantauan), Perpanjang (tambah 6 bulan,
// maks 2x; MOC Sementara ikut menggeser masa berlakunya), atau Tutup (lanjut ke Tinjauan Akhir).
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mocRequests } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { attachStageFiles, isBlankTracked, loadMocItem, mocMonitoringSchema, recordMocHistory, requireMocAction } from "@/lib/api/moc";
import {
  addMonthsYmd,
  MOC_EXTENSION_MONTHS,
  mocExtensionsUsed,
  mocMonitoringIssues,
  wibYmd,
  type MocMonitoringEntry,
} from "@/lib/domain/moc";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const moc = await requireMocAction(params.id, user, "monitor");
    const { attachmentFileIds, ...parsed } = mocMonitoringSchema.parse(await req.json());
    const input = {
      ...parsed,
      activities: parsed.activities.filter((r) => !isBlankTracked(r)),
      followUps: parsed.followUps.filter((r) => !isBlankTracked(r)),
    };

    const issues = mocMonitoringIssues(input, mocExtensionsUsed(moc), wibYmd(Date.now()));
    if (issues.length > 0) throw new HttpError(400, "Catatan pemantauan belum lengkap.", { issues });

    const entry: MocMonitoringEntry = {
      ...input,
      no: moc.monitoring.length + 1,
      recordedById: user.id,
      recordedByName: user.name,
      recordedAt: new Date().toISOString(),
    };
    const patch: Partial<typeof mocRequests.$inferInsert> = { monitoring: [...moc.monitoring, entry], updatedAt: new Date() };

    let notes = `Pemantauan ke-${entry.no} (${entry.date}): ${input.outcome}.`;
    let toState: string | undefined;
    if (input.outcome === "Tutup") {
      patch.registerStatus = "Tinjauan Akhir";
      toState = "Tinjauan Akhir";
      notes += " Pemantauan ditutup, lanjut ke Tinjauan Akhir.";
    } else if (input.outcome === "Perpanjang" && moc.sifatPerubahan === "Sementara" && moc.validUntil) {
      const next = addMonthsYmd(moc.validUntil, MOC_EXTENSION_MONTHS);
      patch.validUntil = next;
      notes += ` Masa berlaku diperpanjang ${MOC_EXTENSION_MONTHS} bulan hingga ${next}.`;
    }
    if (input.notes) notes += ` ${input.notes}`;

    await db.update(mocRequests).set(patch).where(eq(mocRequests.id, moc.id));
    await recordMocHistory(moc.id, user, "Pemantauan Dicatat", {
      notes,
      ...(toState ? { fromState: moc.registerStatus, toState } : {}),
    });
    await attachStageFiles(moc.id, attachmentFileIds, user, "Pemantauan");
    return NextResponse.json(await loadMocItem(moc.id));
  });
}
