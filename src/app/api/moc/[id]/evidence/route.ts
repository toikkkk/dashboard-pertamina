// Melampirkan bukti tanda tangan (berkas bertanda tangan yang diunggah balik) ke MOC
// kapan saja setelah aksinya — mis. bila berkas baru siap belakangan. Hanya pemegang
// peran pada slot tersebut di lokasi MOC itu yang boleh melampirkan.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth/session";
import { ForbiddenError } from "@/lib/auth/rbac";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { attachMocEvidence, loadMocItem } from "@/lib/api/moc";
import { MOC_EVIDENCE_SLOTS, MOC_INITIATOR_ROLE, mocCanAttach } from "@/lib/domain/moc";

const bodySchema = z.object({
  slot: z.enum(MOC_EVIDENCE_SLOTS),
  fileId: z.string().uuid(),
  reviewId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const moc = await loadMocItem(params.id);
    if (!moc) throw new HttpError(404, "MOC tidak ditemukan.");
    const { slot, fileId, reviewId } = bodySchema.parse(await req.json());

    const inLocation = !!user.location && user.location === moc.location;
    const allowed =
      inLocation &&
      (slot === "lampiran"
        ? mocCanAttach(moc, user)
        : slot === "initiator"
        ? user.role === MOC_INITIATOR_ROLE
        : slot === "reviewer"
          ? moc.reviews.some((r) => r.reviewerUserId === user.id && (!reviewId || r.id === reviewId))
          : slot === "approver"
            ? moc.approverUserId === user.id
            : user.role.includes("Controller"));
    if (!allowed) throw new ForbiddenError("Anda tidak berwenang melampirkan bukti pada bagian ini.");

    const ok = await attachMocEvidence(moc.id, slot, fileId, user, slot === "reviewer" ? reviewId : undefined, slot === "lampiran" ? (moc.registerStatus === "Inisiasi & Validasi" ? "Terdaftar" : moc.registerStatus) : undefined);
    if (!ok) throw new HttpError(400, "Berkas bukti tidak valid atau bukan unggahan Anda.");
    return NextResponse.json(await loadMocItem(moc.id));
  });
}
