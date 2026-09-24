// GET: Register MOC (hak BACA semua lokasi — lihat rbac.ts). POST: buat draf MOC baru;
// hanya Initiator di lokasinya sendiri (Admin Regional hanya melihat).
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { mocRequests } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertLocationRead, assertOnboarded, ForbiddenError } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";
import { loadMocItem, loadMocList, mocFormPatchSchema, recordMocHistory } from "@/lib/api/moc";
import { MOC_INITIATOR_ROLE } from "@/lib/domain/moc";

export async function GET() {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertLocationRead(user);
    return NextResponse.json(await loadMocList());
  });
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertOnboarded(user);
    if (user.isRegionalAdmin || !user.location || user.role !== MOC_INITIATOR_ROLE) {
      throw new ForbiddenError("Hanya Initiator di lokasi yang dapat membuat MOC.");
    }
    const patch = mocFormPatchSchema.parse(await req.json().catch(() => ({})));

    const [created] = await db
      .insert(mocRequests)
      .values({
        unitOperasi: user.location,
        tanggal: new Date().toISOString().slice(0, 10),
        ...patch,
        location: user.location,
        createdBy: user.id,
      })
      .returning({ id: mocRequests.id });

    await recordMocHistory(created.id, user, "Draf Dibuat", { toState: "draft" });
    return NextResponse.json(await loadMocItem(created.id), { status: 201 });
  });
}
