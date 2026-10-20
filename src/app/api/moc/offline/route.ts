// Catat MOC Offline: MOC yang sudah dibuat di luar aplikasi dicatat ke Register beserta dokumennya. Hanya Controller
// lokasi itu atau Admin Regional. Nomor MoC disusun dari nomor urut, bulan, dan tahun yang diisi (format standar
// AAA/MOC/KBO/BB/TAHUN) sehingga nomor otomatis berikutnya melanjutkan dari nomor terbesar yang tercatat. Catatan offline
// tidak diproses di alur aplikasi (tanpa tindakan); dokumennya disimpan sebagai bukti.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { locations, mocRequests } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { ForbiddenError, assertOnboarded } from "@/lib/auth/rbac";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { attachMocEvidence, loadMocItem, recordMocHistory } from "@/lib/api/moc";
import { MOC_REGISTER_STATUSES, MOC_SIFAT_PERUBAHAN } from "@/lib/domain/moc";
import { formatMocNumber, kboForMoc } from "@/lib/domain/kbo";

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
  fileIds: z.array(z.string().uuid()).min(1, "Unggah minimal satu dokumen.").max(20),
});

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertOnboarded(user);
    const isController = user.role.includes("Controller");
    if (!user.isRegionalAdmin && !isController) throw new ForbiddenError("Hanya Controller lokasi atau Admin Regional yang dapat mencatat MOC offline.");
    const b = bodySchema.parse(await req.json());
    if (!user.isRegionalAdmin && user.location !== b.location) throw new ForbiddenError("Controller hanya dapat mencatat MOC offline untuk lokasinya sendiri.");

    const [loc] = await db.select({ name: locations.name }).from(locations).where(eq(locations.name, b.location)).limit(1);
    if (!loc) throw new HttpError(400, "Lokasi tidak dikenal.");
    const kbo = kboForMoc(b.location, b.fungsi);
    if (!kbo) throw new HttpError(422, "KBO untuk lokasi atau fungsi ini belum ditetapkan; unit Regional wajib memilih fungsi pengusul.");

    const number = formatMocNumber(b.sequence, kbo, b.month, b.year);
    const [dup] = await db.select({ id: mocRequests.id }).from(mocRequests).where(eq(mocRequests.mocNumber, number)).limit(1);
    if (dup) throw new HttpError(409, `Nomor MoC ${number} sudah ada di Register.`);

    const [created] = await db
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
      })
      .returning({ id: mocRequests.id });

    for (const fileId of b.fileIds) {
      const ok = await attachMocEvidence(created.id, "controller", fileId, user, undefined, "Offline");
      if (!ok) {
        await db.delete(mocRequests).where(eq(mocRequests.id, created.id)); // batalkan agar tidak ada catatan setengah jadi
        throw new HttpError(400, "Ada berkas yang tidak valid atau bukan unggahan Anda.");
      }
    }
    await recordMocHistory(created.id, user, "Dicatat Offline", {
      notes: `MOC offline dicatat dengan Nomor ${number} (${b.registerStatus}), ${b.fileIds.length} dokumen.`,
      toState: "registered",
    });
    return NextResponse.json(await loadMocItem(created.id));
  });
}
