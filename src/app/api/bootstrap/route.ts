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
      // Return minimal stub for unauthenticated users to prevent SWR from hanging
      // This also ensures the landing page can show at least some structure while waiting
      const { REGIONAL_LOCATIONS } = await import("@/lib/mockData");
      return NextResponse.json({
        user: null,
        documents: [],
        allDocuments: [],
        users: [],
        locations: REGIONAL_LOCATIONS, // Fallback to mock data when no session
      });
    }

    // allDocuments is a deliberate, pre-existing exception (see CLAUDE.md): the
    // dashboard's cross-location benchmarking widgets (ComplianceChart,
    // DocsByLocationChart) always read unfiltered totals, even for non-admins —
    // only the real document *list*/actions are RBAC-scoped to `documents`.
    const [documentItems, allDocumentItems, userRows, locRows, targetRows] = await Promise.all([
      loadDocumentsForUser(sessionUser),
      loadAllDocuments(),
      db
        .select({ id: users.id, name: users.name, email: users.email, role: users.role, location: users.location, isRegionalAdmin: users.isRegionalAdmin, requestedRole: users.requestedRole, requestedLocation: users.requestedLocation, mocRoles: users.mocRoles, mocFunction: users.mocFunction })
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
        requestedRole: sessionUser.requestedRole,
        requestedLocation: sessionUser.requestedLocation,
        mocRoles: sessionUser.mocRoles,
        mocFunction: sessionUser.mocFunction,
      },
      documents: documentItems,
      allDocuments: allDocumentItems,
      users: userRows,
      locations: locationTargetsResult,
    });
  });
}
