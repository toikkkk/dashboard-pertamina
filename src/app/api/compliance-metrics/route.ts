// Backs getComplianceMetrics() — deliberately NOT location-scoped (matches
// psiStore.tsx's original comment: compliance % is intentionally cross-location for
// benchmarking, an established exception to the RBAC filter every other read path
// uses). Query params `location` and `psiType` mirror selectedLocationFilter/
// selectedTypeFilter ("ALL" or a specific value).
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { documents, locations, locationTargets } from "@/lib/db/schema";
import { requireSessionUser } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api/respond";
import type { PSIType } from "@/lib/domain/types";

const PSI_TYPES: PSIType[] = [
  "Informasi Bahan Berbahaya",
  "Informasi Teknologi Proses",
  "Informasi Peralatan",
  "Sistem Tata Kerja",
];

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    await requireSessionUser();

    const { searchParams } = new URL(req.url);
    const locationFilter = searchParams.get("location") ?? "ALL";
    const typeFilter = searchParams.get("psiType") ?? "ALL";

    const [allLocations, allTargets, allDocs] = await Promise.all([
      db.select().from(locations),
      db.select().from(locationTargets),
      db.select({ psiType: documents.psiType, status: documents.status, location: documents.location }).from(documents),
    ]);

    const targetLocations = allLocations.filter((l) => locationFilter === "ALL" || l.name === locationFilter);

    const byType = {} as Record<PSIType, { approved: number; target: number; pct: number }>;
    let totalTarget = 0;
    let totalApproved = 0;

    for (const type of PSI_TYPES) {
      if (typeFilter !== "ALL" && typeFilter !== type) {
        byType[type] = { approved: 0, target: 0, pct: 0 };
        continue;
      }
      const typeTarget = targetLocations.reduce((sum, loc) => {
        const t = allTargets.find((tr) => tr.locationName === loc.name && tr.psiType === type);
        return sum + (t?.target ?? 0);
      }, 0);

      const approvedDocs = allDocs.filter((d) => {
        const matchesLoc = locationFilter === "ALL" || d.location === locationFilter;
        return matchesLoc && d.psiType === type && d.status === "Approved";
      }).length;

      totalTarget += typeTarget;
      totalApproved += approvedDocs;
      byType[type] = {
        approved: approvedDocs,
        target: typeTarget,
        pct: typeTarget > 0 ? Math.min(100, Math.round((approvedDocs / typeTarget) * 100)) : 0,
      };
    }

    return NextResponse.json({
      totalApproved,
      totalTarget,
      percentage: totalTarget > 0 ? Math.min(100, Math.round((totalApproved / totalTarget) * 100)) : 0,
      byType,
    });
  });
}
