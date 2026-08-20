// Combined first-paint payload — avoids psiStore.tsx firing 4 separate requests
// (me, documents, users, locations) in a waterfall on every page load.
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { users, locations, locationTargets } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api/respond";
import { loadDocumentsForUser, loadAllDocuments } from "@/lib/api/documents";
import type { LocationTarget, PSIType } from "@/lib/domain/types";

export async function GET() {
  return withErrorHandling(async () => {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ user: null, documents: [], users: [], locations: [] });
    }

    // allDocuments is a deliberate, pre-existing exception (see CLAUDE.md): the
    // dashboard's cross-location benchmarking widgets (ComplianceChart,
    // DocsByLocationChart) always read unfiltered totals, even for non-admins —
    // only the real document *list*/actions are RBAC-scoped to `documents`.
    const [documentItems, allDocumentItems, userRows, locRows, targetRows] = await Promise.all([
      loadDocumentsForUser(sessionUser),
      loadAllDocuments(),
      db
        .select({ id: users.id, name: users.name, email: users.email, role: users.role, location: users.location, isRegionalAdmin: users.isRegionalAdmin })
        .from(users),
      db.select().from(locations),
      db.select().from(locationTargets),
    ]);

    const locationTargetsResult: LocationTarget[] = locRows.map((loc) => {
      const targets = {} as Record<PSIType, number>;
      for (const t of targetRows.filter((tr) => tr.locationName === loc.name)) {
        targets[t.psiType as PSIType] = t.target;
      }
      return { locationName: loc.name, locationType: loc.locationType as LocationTarget["locationType"], region: loc.region, targets };
    });

    return NextResponse.json({
      user: {
        id: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
        role: sessionUser.role,
        location: sessionUser.location,
        isRegionalAdmin: sessionUser.isRegionalAdmin,
      },
      documents: documentItems,
      allDocuments: allDocumentItems,
      users: userRows,
      locations: locationTargetsResult,
    });
  });
}
