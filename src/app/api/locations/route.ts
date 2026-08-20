// Equivalent of REGIONAL_LOCATIONS from mockData.ts, assembled from the real
// `locations` + `location_targets` tables instead of a hardcoded array.
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { locations, locationTargets } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api/respond";
import type { LocationTarget, PSIType } from "@/lib/domain/types";

export async function GET() {
  return withErrorHandling(async () => {
    await requireSessionUser();

    const [locRows, targetRows] = await Promise.all([
      db.select().from(locations),
      db.select().from(locationTargets),
    ]);

    const result: LocationTarget[] = locRows.map((loc) => {
      const targets = {} as Record<PSIType, number>;
      for (const t of targetRows.filter((tr) => tr.locationName === loc.name)) {
        targets[t.psiType as PSIType] = t.target;
      }
      return {
        locationName: loc.name,
        locationType: loc.locationType as LocationTarget["locationType"],
        region: loc.region,
        targets,
      };
    });

    return NextResponse.json(result);
  });
}
