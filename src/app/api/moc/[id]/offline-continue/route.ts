// Lanjutkan catatan MOC offline: Controller lokasi itu atau Admin Regional menambah Form 6/7 dan/atau menaikkan status
// terakhir pada catatan offline yang sudah ada (tanpa alur persetujuan aplikasi). Status hanya boleh maju; berkas
// wajib mengikuti status baru (Form 6 mulai Pemantauan, Form 7 saat Closed), dihitung bersama berkas yang sudah tersimpan.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mocEvidence, mocRequests } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { ForbiddenError, assertOnboarded } from "@/lib/auth/rbac";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { attachMocEvidence, loadMocItem, recordMocHistory } from "@/lib/api/moc";
import { MOC_REGISTER_STATUSES } from "@/lib/domain/moc";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).default("");
const bodySchema = z.object({
  registerStatus: z.enum(MOC_REGISTER_STATUSES),
  tanggalDisetujui: ymd,
  tanggalDitutup: ymd,
  form6: z.array(z.string().uuid()).max(20).default([]),
  form7: z.array(z.string().uuid()).max(20).default([]),
});

const needs6 = (s: string) => s === "Pemantauan" || s === "Tinjauan Akhir" || s === "Closed";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertOnboarded(user);
    const b = bodySchema.parse(await req.json());

    const [moc] = await db.select().from(mocRequests).where(eq(mocRequests.id, params.id)).limit(1);
    if (!moc || moc.deletedAt) throw new HttpError(404, "MOC tidak ditemukan.");
    if (!moc.isOffline) throw new HttpError(400, "Hanya catatan MOC offline yang dapat dilanjutkan dengan cara ini.");
    const isController = user.role.includes("Controller");
    if (!user.isRegionalAdmin && !(isController && user.location === moc.location)) {
      throw new ForbiddenError("Hanya Controller lokasi ini atau Admin Regional yang dapat melanjutkan catatan offline.");
    }
    if (moc.registerStatus === "Closed") throw new HttpError(400, "Catatan ini sudah Closed.");

    const order = (s: string) => MOC_REGISTER_STATUSES.indexOf(s as (typeof MOC_REGISTER_STATUSES)[number]);
    if (order(b.registerStatus) < order(moc.registerStatus)) throw new HttpError(400, "Status tidak boleh mundur.");
    const sameStatus = b.registerStatus === moc.registerStatus;
    if (sameStatus && b.form6.length + b.form7.length === 0) throw new HttpError(400, "Pilih status yang lebih lanjut atau unggah berkas baru.");

    const existing = await db.select({ stage: mocEvidence.stage }).from(mocEvidence).where(eq(mocEvidence.mocId, moc.id));
    const has6 = existing.some((e) => e.stage === "Offline-Form6") || b.form6.length > 0;
    const has7 = existing.some((e) => e.stage === "Offline-Form7") || b.form7.length > 0;
    const missing: string[] = [];
    if (needs6(b.registerStatus) && !has6) missing.push("Form 6 (Pemantauan)");
    if (b.registerStatus === "Closed" && !has7) missing.push("Form 7 (Tinjauan Akhir & Penutupan)");
    if (missing.length > 0) throw new HttpError(400, `Unggah dokumen wajib: ${missing.join(", ")}.`);

    const needsApproved = b.registerStatus !== "Inisiasi & Validasi" && !moc.approvedAt;
    if (needsApproved && !b.tanggalDisetujui) throw new HttpError(400, "Tanggal disetujui wajib diisi untuk status ini.");
    if (b.registerStatus === "Closed" && !b.tanggalDitutup) throw new HttpError(400, "Tanggal ditutup wajib diisi untuk MOC yang sudah Closed.");

    // Berkas dilampirkan lebih dulu; bila ada yang tidak sah, status belum diubah.
    const uploads: [string, string][] = [...b.form6.map((f): [string, string] => [f, "Offline-Form6"]), ...b.form7.map((f): [string, string] => [f, "Offline-Form7"])];
    for (const [fileId, stage] of uploads) {
      const ok = await attachMocEvidence(moc.id, "controller", fileId, user, undefined, stage);
      if (!ok) throw new HttpError(400, "Ada berkas yang tidak valid atau bukan unggahan Anda.");
    }

    const closedAt = b.registerStatus === "Closed" ? new Date(`${b.tanggalDitutup}T00:00:00+07:00`).toISOString() : null;
    await db
      .update(mocRequests)
      .set({
        registerStatus: b.registerStatus,
        ...(needsApproved ? { approvedAt: new Date(`${b.tanggalDisetujui}T00:00:00+07:00`) } : {}),
        ...(closedAt ? { closure: { note: "Dicatat dari dokumen offline", closedAt, closedById: user.id, closedByName: user.name, onBehalfOf: null, finalizedAt: closedAt, finalizedByName: user.name } } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(mocRequests.id, moc.id), eq(mocRequests.isOffline, true)));

    await recordMocHistory(moc.id, user, "Dicatat Offline", {
      notes: `Catatan offline dilanjutkan: ${moc.registerStatus} → ${b.registerStatus}${uploads.length ? `, ${uploads.length} dokumen baru (Form 6: ${b.form6.length}, Form 7: ${b.form7.length})` : ""}.`,
      toState: "registered",
    });
    return NextResponse.json(await loadMocItem(moc.id));
  });
}
