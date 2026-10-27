// Catat MOC Offline: MOC yang sudah dibuat di luar aplikasi dicatat ke Register beserta dokumennya. Hanya Controller
// lokasi itu atau Admin Regional. Nomor MoC disusun dari nomor urut, bulan, dan tahun yang diisi (format standar
// AAA/MOC/KBO/BB/TAHUN) sehingga nomor otomatis berikutnya melanjutkan dari nomor terbesar yang tercatat. Catatan offline
// tidak diproses di alur aplikasi (tanpa tindakan); dokumennya disimpan sebagai bukti.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, like } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { locations, mocRequests } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { ForbiddenError, assertOnboarded } from "@/lib/auth/rbac";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { attachMocEvidence, loadMocItem, recordMocHistory } from "@/lib/api/moc";
import { MOC_REGISTER_STATUSES, MOC_SIFAT_PERUBAHAN } from "@/lib/domain/moc";
import { formatMocNumber, kboForMoc, parseRegionalSequence } from "@/lib/domain/kbo";
import { isRegionalUnit } from "@/lib/domain/regionalUnit";

const bodySchema = z.object({
  location: z.string().trim().min(1),
  fungsi: z.string().trim().max(200).default(""),
  judul: z.string().trim().min(3, "Judul wajib diisi.").max(300),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid."),
  sequence: z.number().int().min(1).max(9999),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  sifatPerubahan: z.enum(MOC_SIFAT_PERUBAHAN),
  registerStatus: z.enum(MOC_REGISTER_STATUSES),
  initiatorName: z.string().trim().max(200).default(""),
  deskripsi: z.string().trim().max(5000).default(""),
  tanggalDisetujui: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).default(""),
  tanggalDitutup: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).default(""),
  // Dokumen dipisah per form (Lampiran 5, 6, 7); wajib sesuai status terakhir.
  form5: z.array(z.string().uuid()).max(20).default([]),
  form6: z.array(z.string().uuid()).max(20).default([]),
  form7: z.array(z.string().uuid()).max(20).default([]),
});

// Form wajib per status terakhir: Form 5 selalu; Form 6 mulai Pemantauan; Form 7 saat Closed.
const needs6 = (s: string) => s === "Pemantauan" || s === "Tinjauan Akhir" || s === "Closed";

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertOnboarded(user);
    const isController = user.role.includes("Controller");
    if (!user.isRegionalAdmin && !isController) throw new ForbiddenError("Hanya Controller lokasi atau Admin Regional yang dapat mencatat MOC offline.");
    const b = bodySchema.parse(await req.json());
    if (!user.isRegionalAdmin && user.location !== b.location) throw new ForbiddenError("Controller hanya dapat mencatat MOC offline untuk lokasinya sendiri.");

    const missing: string[] = [];
    if (b.form5.length === 0) missing.push("Form 5 (Pengusulan & Validasi)");
    if (needs6(b.registerStatus) && b.form6.length === 0) missing.push("Form 6 (Pemantauan)");
    if (b.registerStatus === "Closed" && b.form7.length === 0) missing.push("Form 7 (Tinjauan Akhir & Penutupan)");
    if (missing.length > 0) throw new HttpError(400, `Unggah dokumen wajib: ${missing.join(", ")}.`);
    if (b.registerStatus !== "Inisiasi & Validasi" && !b.tanggalDisetujui) throw new HttpError(400, "Tanggal disetujui wajib diisi untuk status ini.");
    if (b.registerStatus === "Closed" && !b.tanggalDitutup) throw new HttpError(400, "Tanggal ditutup wajib diisi untuk MOC yang sudah Closed.");

    const [loc] = await db.select({ name: locations.name }).from(locations).where(eq(locations.name, b.location)).limit(1);
    if (!loc) throw new HttpError(400, "Lokasi tidak dikenal.");
    const kbo = kboForMoc(b.location, b.fungsi);
    if (!kbo) throw new HttpError(422, "KBO untuk lokasi atau fungsi ini belum ditetapkan; unit Regional wajib memilih fungsi pengusul.");

    const number = formatMocNumber(b.sequence, kbo, b.month, b.year);
    const [dup] = await db.select({ id: mocRequests.id, deletedAt: mocRequests.deletedAt }).from(mocRequests).where(eq(mocRequests.mocNumber, number)).limit(1);
    if (dup) throw new HttpError(409, dup.deletedAt ? `Nomor MoC ${number} dipakai MOC yang ada di Sampah. Pulihkan atau hapus permanen MOC itu dulu.` : `Nomor MoC ${number} sudah ada di Register.`);

    // Unit Regional memakai satu urutan untuk semua fungsi: nomor urut yang sama pada tahun yang sama tidak boleh dipakai dua kali,
    // walau KBO fungsinya berbeda.
    if (isRegionalUnit(b.location)) {
      const sameYear = await db.select({ n: mocRequests.mocNumber, deletedAt: mocRequests.deletedAt }).from(mocRequests).where(like(mocRequests.mocNumber, `%/MOC/%/%/${b.year}`));
      const clash = sameYear.find((r) => parseRegionalSequence(r.n, b.year) === b.sequence);
      if (clash) throw new HttpError(409, `Nomor urut ${String(b.sequence).padStart(3, "0")} tahun ${b.year} sudah dipakai di unit Regional (${clash.n})${clash.deletedAt ? ", MOC itu ada di Sampah" : ""}. Unit Regional memakai satu urutan untuk semua fungsi.`);
    }

    let created: { id: string };
    try {
      [created] = await db
      .insert(mocRequests)
      .values({
        location: b.location,
        unitOperasi: b.location,
        fungsi: b.fungsi,
        tanggal: b.tanggal,
        judul: b.judul,
        sifatPerubahan: b.sifatPerubahan,
        deskripsi: b.deskripsi,
        initiatorName: b.initiatorName,
        mocNumber: number,
        registerStatus: b.registerStatus,
        validationState: "registered",
        isOffline: true,
        createdBy: user.id,
        approvedAt: b.tanggalDisetujui ? new Date(`${b.tanggalDisetujui}T00:00:00+07:00`) : null,
        closure: b.registerStatus === "Closed"
          ? { note: "Dicatat dari dokumen offline", closedAt: new Date(`${b.tanggalDitutup}T00:00:00+07:00`).toISOString(), closedById: user.id, closedByName: user.name, onBehalfOf: null, finalizedAt: new Date(`${b.tanggalDitutup}T00:00:00+07:00`).toISOString(), finalizedByName: user.name }
          : null,
      })
      .returning({ id: mocRequests.id });
    } catch (err) {
      if (/duplicate key|unique/i.test(String((err as Error)?.message ?? err))) throw new HttpError(409, `Nomor MoC ${number} sudah ada di Register.`);
      throw err;
    }

    const uploads = [...b.form5.map((f) => [f, "Offline-Form5"]), ...b.form6.map((f) => [f, "Offline-Form6"]), ...b.form7.map((f) => [f, "Offline-Form7"])];
    for (const [fileId, stage] of uploads) {
      const ok = await attachMocEvidence(created.id, "controller", fileId, user, undefined, stage);
      if (!ok) {
        await db.delete(mocRequests).where(eq(mocRequests.id, created.id)); // batalkan agar tidak ada catatan setengah jadi
        throw new HttpError(400, "Ada berkas yang tidak valid atau bukan unggahan Anda.");
      }
    }
    await recordMocHistory(created.id, user, "Dicatat Offline", {
      notes: `MOC offline dicatat dengan Nomor ${number} (${b.registerStatus}), ${uploads.length} dokumen (Form 5: ${b.form5.length}, Form 6: ${b.form6.length}, Form 7: ${b.form7.length}).`,
      toState: "registered",
    });
    return NextResponse.json(await loadMocItem(created.id));
  });
}
