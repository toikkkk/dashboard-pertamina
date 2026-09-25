// Lets a pending (just-registered / just-Google-signed-in) user submit their desired
// role + terminal AFTER account creation, from the small onboarding popup. Stores to
// users.requested_role / requested_location — same fields the register route can set —
// and NEVER grants anything: role stays "Penanggung Jawab PSI (Initiator)" and
// location stays NULL until an Admin Regional approves on /admin/users. This exists as
// its own route (rather than folding it into register) so the Google-OAuth path and the
// password path share one "pick my role/location" step that can also be re-run later.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, locations } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api/respond";
import { MOC_ROLE_FLAGS, MOC_ROLES_NEED_FUNCTION } from "@/lib/domain/moc";

const ROLES = ["Penanggung Jawab PSI (Initiator)", "PSI / MOC Controller", "Admin Regional"] as const;

const bodySchema = z.object({
  role: z.enum(ROLES),
  location: z.string().trim().min(1).max(200),
  // Usulan peran MOC (TKO B13.3-07) + fungsi/jabatan; keduanya opsional.
  mocRoles: z.array(z.enum(MOC_ROLE_FLAGS)).max(MOC_ROLE_FLAGS.length).optional(),
  mocFunction: z.string().trim().max(100).nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const parsed = bodySchema.parse(await req.json());
    const { role, location } = parsed;
    // Admin Regional tidak membawa peran MOC tambahan.
    const mocRoles = role === "Admin Regional" ? [] : Array.from(new Set(parsed.mocRoles ?? []));
    const mocFunction = mocRoles.length > 0 ? parsed.mocFunction?.trim() || null : null;
    if (mocRoles.some((r) => MOC_ROLES_NEED_FUNCTION.includes(r)) && !mocFunction) {
      return NextResponse.json({ error: "Fungsi/jabatan wajib diisi untuk peran Reviewer atau Approver." }, { status: 400 });
    }

    const [loc] = await db.select({ name: locations.name }).from(locations).where(eq(locations.name, location)).limit(1);
    if (!loc) {
      return NextResponse.json({ error: "Lokasi terminal tidak valid." }, { status: 400 });
    }

    const [updated] = await db
      .update(users)
      .set({ requestedRole: role, requestedLocation: loc.name, requestedMocRoles: mocRoles, requestedMocFunction: mocFunction, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      location: updated.location,
      isRegionalAdmin: updated.isRegionalAdmin,
      requestedRole: updated.requestedRole,
      requestedLocation: updated.requestedLocation,
      requestedMocRoles: updated.requestedMocRoles,
      requestedMocFunction: updated.requestedMocFunction,
    });
  });
}
