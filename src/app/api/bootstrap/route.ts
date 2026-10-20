// Combined first-paint payload — avoids psiStore.tsx firing 4 separate requests
// (me, documents, users, locations) in a waterfall on every page load.
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, locations, locationTargets } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api/respond";
import { loadAllDocuments } from "@/lib/api/documents";
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

    // Akun pending (belum ditetapkan lokasi/peran oleh Admin Regional, mis. baru
    // self-register) TIDAK boleh dapat allDocuments/daftar user — dulu setiap sesi
    // yang login, termasuk yang baru daftar sendiri dan belum di-approve siapa pun,
    // langsung menerima seluruh dokumen semua lokasi + nama+email SETIAP user di
    // sistem (celah kebocoran data nyata, ditemukan lewat audit kode). `documents`
    // tetap aman dipakai (query-nya sudah otomatis kosong untuk location=null) dan
    // `locations` tetap wajib dikirim (dipakai pemilih terminal di modal onboarding).
    const isPending = (!sessionUser.isRegionalAdmin && !sessionUser.location) || sessionUser.mustChangePassword;

    // allDocuments is a deliberate, pre-existing exception (see CLAUDE.md): the
    // dashboard's cross-location benchmarking widgets (ComplianceChart,
    // DocsByLocationChart) always read unfiltered totals, even for non-admins —
    // only the real document *list*/actions are RBAC-scoped to `documents`. This
    // exception assumes an ONBOARDED user; a pending session gets none of it.
    //
    // `documents` used to be fetched via a SEPARATE loadDocumentsForUser() call —
    // for every non-admin, that's a strict subset of allDocuments, so every one of
    // their own-location documents was assembled TWICE per request (each assembly
    // itself already does several queries — routes/history/diffs/file lookups —
    // per document). Derived from the single allDocuments fetch below instead
    // (audit 2026-09-30: real, present-today waste, not just a future scaling risk).
    const [allDocumentItems, userRows, locRows, targetRows] = await Promise.all([
      isPending ? Promise.resolve([]) : loadAllDocuments(),
      // Daftar user: Admin Regional (Kelola User) menerima SEMUA kolom; user biasa hanya rekan SATU LOKASI dan
      // tanpa email / usulan peran (dipakai untuk memilih Reviewer/Approver/Performer MOC di lokasinya) —
      // dulu setiap user aktif menerima nama+email seluruh user di semua lokasi.
      isPending
        ? Promise.resolve([])
        : sessionUser.isRegionalAdmin
          ? db
              .select({ id: users.id, name: users.name, email: users.email, role: users.role, location: users.location, isRegionalAdmin: users.isRegionalAdmin, requestedRole: users.requestedRole, requestedLocation: users.requestedLocation, requestedMocRoles: users.requestedMocRoles, requestedMocFunction: users.requestedMocFunction, mocRoles: users.mocRoles, mocFunction: users.mocFunction, emailVerifiedAt: users.emailVerifiedAt, mfaEnabled: users.mfaEnabled })
              .from(users)
          : db
              .select({ id: users.id, name: users.name, role: users.role, location: users.location, isRegionalAdmin: users.isRegionalAdmin, mocRoles: users.mocRoles, mocFunction: users.mocFunction, username: users.username })
              .from(users)
              .where(eq(users.location, sessionUser.location!)),
      db.select().from(locations),
      db.select().from(locationTargets),
    ]);
    const documentItems = sessionUser.isRegionalAdmin ? allDocumentItems : allDocumentItems.filter((d) => d.location === sessionUser.location);

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
        requestedMocRoles: sessionUser.requestedMocRoles,
        requestedMocFunction: sessionUser.requestedMocFunction,
        mocRoles: sessionUser.mocRoles,
        mocFunction: sessionUser.mocFunction,
        mustChangePassword: sessionUser.mustChangePassword,
      },
      documents: documentItems,
      allDocuments: allDocumentItems,
      users: userRows,
      locations: locationTargetsResult,
    });
  });
}
