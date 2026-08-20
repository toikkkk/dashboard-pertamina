// Server-side enforcement of the same location-scoping rule the client-only
// prototype only ever applied client-side (psiStore.tsx's `documents` filter).
// That was fine when there was no server to bypass; now that real API routes
// exist, this MUST be the actual gate — a non-admin client filtering its own view
// proves nothing about what the server will hand back to a direct API call.
import type { SessionUser } from "./session";

export class ForbiddenError extends Error {
  constructor(message = "Anda tidak memiliki akses ke sumber daya ini.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Sesi tidak valid atau sudah berakhir.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export function assertLocationAccess(user: SessionUser, resourceLocation: string): void {
  if (user.isRegionalAdmin) return;
  if (user.location === resourceLocation) return;
  throw new ForbiddenError();
}

export function assertRegionalAdmin(user: SessionUser): void {
  if (!user.isRegionalAdmin) throw new ForbiddenError("Halaman ini khusus Admin Regional.");
}

// A pending-onboarding user (location === null, not admin) is authenticated but
// shouldn't be able to act on anything location-scoped — mirrors AuthGuard.tsx's
// client-side gate, enforced again here since the server can't trust the client
// ever reached that gate.
export function assertOnboarded(user: SessionUser): void {
  if (!user.isRegionalAdmin && !user.location) {
    throw new ForbiddenError("Akun Anda menunggu aktivasi Admin Regional.");
  }
}
