// MoC Controller meregistrasi MOC yang sudah disetujui ke daftar MoC (TKO Tahap C, langkah 4) dan Nomor MoC
// dibuat otomatis oleh sistem dengan format client: AAA/MOC/PPNXXXXXXX/BB/TAHUN (lihat domain/kbo.ts). Nomor urut
// AAA di-reset per tahun: per KBO untuk terminal, satu urutan bersama semua fungsi untuk unit Regional (KBO tetap per fungsi); bulan dan tahun diambil dari PENGAJUAN pertama oleh Initiator. Nomor tidak
// diketik manual agar urutan tidak loncat atau ganda.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, asc, eq, like } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mocHistory, mocRequests } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { attachMocEvidence, loadMocItem, recordMocHistory, requireMocAction } from "@/lib/api/moc";
import { PENGUSULAN_EVIDENCE_STAGE } from "@/lib/domain/moc";
import { formatMocNumber, kboForMoc, parseMocSequence, parseRegionalSequence, wibMonthYear } from "@/lib/domain/kbo";
import { isRegionalUnit } from "@/lib/domain/regionalUnit";

const bodySchema = z.object({
  evidenceFileId: z.string().uuid().optional(),
});

const isDuplicate = (err: unknown) => /duplicate key|unique/i.test(String((err as Error)?.message ?? err));

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const moc = await requireMocAction(params.id, user, "register");
    const { evidenceFileId } = bodySchema.parse(await req.json().catch(() => ({})));
    // Form Pengusulan & Validasi (Lampiran 5) bertanda tangan lengkap WAJIB diunggah saat registrasi.
    if (!evidenceFileId) throw new HttpError(400, "Unggah Form Pengusulan & Validasi (Lampiran 5) yang sudah bertanda tangan lengkap.");
    if (!(await attachMocEvidence(moc.id, "controller", evidenceFileId, user, undefined, PENGUSULAN_EVIDENCE_STAGE))) {
      throw new HttpError(400, "Berkas tidak valid atau bukan unggahan Anda.");
    }

    const kbo = kboForMoc(moc.location, moc.fungsi);
    if (!kbo) throw new HttpError(422, "KBO untuk lokasi atau fungsi MOC ini belum ditetapkan, sehingga Nomor MoC tidak dapat dibuat.");

    // Bulan dan tahun = pengajuan pertama oleh Initiator (bukan saat registrasi).
    const [first] = await db
      .select({ at: mocHistory.timestamp })
      .from(mocHistory)
      .where(and(eq(mocHistory.mocId, moc.id), eq(mocHistory.action, "Diajukan")))
      .orderBy(asc(mocHistory.timestamp))
      .limit(1);
    const { month, year } = wibMonthYear(first?.at ?? new Date());

    // Nomor urut berikutnya untuk KBO dan tahun ini; diulang bila bentrok dengan registrasi yang bersamaan.
    let number = "";
    // MOC yang dilanjutkan kembali sesudah ditunda (mengulang Validasi) tetap memakai Nomor MoC-nya.
    if (moc.mocNumber) {
      await db.update(mocRequests).set({ validationState: "registered", updatedAt: new Date() }).where(eq(mocRequests.id, moc.id));
      number = moc.mocNumber;
    }
    for (let attempt = 0; attempt < 5 && !moc.mocNumber; attempt++) {
      // Unit Regional: satu urutan untuk semua fungsi (KBO berbeda, nomor urut berlanjut). Terminal: per KBO.
      // MOC di Sampah ikut terhitung karena nomornya tetap dicadangkan.
      const regional = isRegionalUnit(moc.location);
      const existing = await db
        .select({ n: mocRequests.mocNumber })
        .from(mocRequests)
        .where(regional ? like(mocRequests.mocNumber, `%/MOC/%/%/${year}`) : like(mocRequests.mocNumber, `%/MOC/${kbo}/%/${year}`));
      const max = existing.reduce((m, r) => Math.max(m, (regional ? parseRegionalSequence(r.n, year) : parseMocSequence(r.n, kbo, year)) ?? 0), 0);
      number = formatMocNumber(max + 1, kbo, month, year);
      try {
        await db.update(mocRequests).set({ mocNumber: number, validationState: "registered", updatedAt: new Date() }).where(eq(mocRequests.id, moc.id));
        break;
      } catch (err) {
        if (!isDuplicate(err) || attempt === 4) throw isDuplicate(err) ? new HttpError(409, "Nomor MoC sedang dipakai registrasi lain. Coba lagi.") : err;
      }
    }

    await recordMocHistory(moc.id, user, "Diregistrasi", {
      notes: `Nomor MoC ${number}.`,
      fromState: moc.validationState,
      toState: "registered",
    });

    return NextResponse.json(await loadMocItem(moc.id));
  });
}
