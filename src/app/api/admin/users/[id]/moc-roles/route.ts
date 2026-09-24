// Menetapkan Peran MOC per akun (Reviewer / Approver / Performer) + fungsinya.
// Peran ini yang menentukan siapa muncul di dropdown pemilihan Reviewer/Approver/
// Performer pada MOC (TKO B13.3-07 Tabel 3); submit/decision memvalidasinya ulang.
// Hanya Admin Regional. Terpisah dari PATCH /api/admin/users/[id] (role + lokasi).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertRegionalAdmin } from "@/lib/auth/rbac";
import { HttpError, withErrorHandling } from "@/lib/api/respond";
import { MOC_ROLE_FLAGS } from "@/lib/domain/moc";

const bodySchema = z.object({
  mocRoles: z.array(z.enum(MOC_ROLE_FLAGS)).max(MOC_ROLE_FLAGS.length),
  mocFunction: z.string().trim().max(100).nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const admin = await requireSessionUser();
    assertRegionalAdmin(admin);
    const { mocRoles, mocFunction } = bodySchema.parse(await req.json());

    const [updated] = await db
      .update(users)
      .set({ mocRoles: Array.from(new Set(mocRoles)), mocFunction: mocFunction || null, updatedAt: new Date() })
      .where(eq(users.id, params.id))
      .returning({ id: users.id, name: users.name, mocRoles: users.mocRoles, mocFunction: users.mocFunction });
    if (!updated) throw new HttpError(404, "User tidak ditemukan.");
    return NextResponse.json(updated);
  });
}
