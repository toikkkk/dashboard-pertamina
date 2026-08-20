// Backs assignUserAccess(userId, role, location) — the only mutation path for role/
// location, used both to activate a pending self-registered account and to edit an
// already-active one (see admin/users/page.tsx's "Ubah" action). The last-admin
// self-lockout guard stays client-side (admin/users/page.tsx already blocks the
// save attempt before it gets here) — this route additionally re-derives
// isRegionalAdmin from the submitted role rather than trusting a separate flag, so
// the two can never disagree.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { assertRegionalAdmin } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";

const bodySchema = z.object({
  role: z.enum(["Penanggung Jawab PSI (Initiator)", "PSI / MOC Controller", "Admin Regional"]),
  location: z.string().trim().min(1),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const admin = await requireSessionUser();
    assertRegionalAdmin(admin);

    const { role, location } = bodySchema.parse(await req.json());
    const isRegionalAdmin = role === "Admin Regional";

    const [updated] = await db
      .update(users)
      .set({ role, location, isRegionalAdmin, updatedAt: new Date() })
      .where(eq(users.id, params.id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      location: updated.location,
      isRegionalAdmin: updated.isRegionalAdmin,
    });
  });
}
