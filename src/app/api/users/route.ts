// Backs the `users` array in psiStore.tsx — used by the admin "Kelola User" table
// and (for admins) the pending-onboarding badge count. `passwordHash` is never
// serialized here under any circumstance, admin or not.
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api/respond";

export async function GET() {
  return withErrorHandling(async () => {
    await requireSessionUser();

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        location: users.location,
        isRegionalAdmin: users.isRegionalAdmin,
      })
      .from(users);

    return NextResponse.json(rows);
  });
}
