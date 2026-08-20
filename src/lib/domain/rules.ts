// Pure business-rule functions — no React, no DOM, no "use client". Safe to import
// from both client components and server-only API routes. These were moved out of
// mockData.ts verbatim (same logic, same comments) when the real backend was added,
// specifically so API route handlers (approve/reject/etc.) can reuse the exact same
// rules the client already enforced, instead of re-deriving them server-side and
// risking drift. See rbac.ts for the location-scoping half of authorization — this
// file is the workflow-state half (who can act on what, given routing state).
import { DocumentItem, HistoryItem, SimulatedUser, LastUpdateType } from "./types";

// Poin #7 Klien (Dilema 5-Tahun): bedakan dokumen yang cuma "diperpanjang" (tanpa
// perubahan teknis) dari yang benar "direvisi" (ada perubahan fasilitas/konten).
// Dicari dari entri riwayat terakhir yang benar-benar berupa perubahan berkas/versi —
// entri seperti Approved/Rejected/Forwarded dilewati karena bukan aksi update konten.
export function getLastUpdateType(history: HistoryItem[]): LastUpdateType {
  const contentActions: HistoryItem['action'][] = ['Created', 'Extended Validity', 'Revised'];
  const lastContentUpdate = [...history].reverse().find((h) => contentActions.includes(h.action));

  if (!lastContentUpdate || lastContentUpdate.action === 'Created') return 'Baru';
  if (lastContentUpdate.action === 'Extended Validity') return 'Diperpanjang';
  return 'Direvisi';
}

// Tahap sirkuler paling awal yang masih Pending untuk dokumen ini (null kalau tidak ada
// yang pending, mis. dokumen sudah Approved atau tidak memakai sirkuler sama sekali).
export function getPendingApprovalStepOrder(doc: DocumentItem): number | null {
  const pendingSteps = doc.routes.filter((r) => r.status === 'Pending').map((r) => r.stepOrder);
  return pendingSteps.length > 0 ? Math.min(...pendingSteps) : null;
}

// Overdue = expiryDate sudah lewat hari ini, ATAU status sudah eksplisit "Expired".
// Dipakai bersama oleh badge nav "Overdue" (Navbar) dan tabel /dilemma agar keduanya
// selalu menghitung himpunan dokumen yang sama — sebelumnya tabel memakai cutoff tahun
// yang di-hardcode (expiryYear <= 2025), yang jadi salah begitu tanggal hari ini lewat
// 2025 dan juga bisa meloloskan dokumen yang statusnya bukan "Expired" tapi tahunnya
// kebetulan cocok, walau expiryDate-nya sendiri belum tentu benar-benar sudah lewat.
export function isDocOverdue(doc: DocumentItem): boolean {
  if (doc.status === 'Expired') return true;
  const expiry = new Date(doc.expiryDate + 'T00:00:00');
  if (isNaN(expiry.getTime())) return false;
  return expiry.getTime() < Date.now();
}

// Apakah user ini berwenang menyetujui dokumen pada tahap sirkuler yang sedang pending.
// This is the CLIENT-facing convenience check (controls whether the approve/reject UI
// renders at all) — server-side API routes must call this same function again before
// mutating, never trust that a request only arrived because the button was visible.
export function canUserApproveDoc(doc: DocumentItem, user: SimulatedUser): boolean {
  if (doc.status !== 'In Routing') return false;
  const stepOrder = getPendingApprovalStepOrder(doc);
  if (stepOrder === null) return false;
  return doc.routes.some(
    (r) =>
      r.stepOrder === stepOrder &&
      r.status === 'Pending' &&
      (r.approverName === user.name || user.role.includes('Controller') || user.isRegionalAdmin)
  );
}

// The 4 built-in demo users don't carry a real `email` field — this derives the same
// mocked @pertamina.com address consistently everywhere it's displayed or matched
// against (login lookup, admin user list). Self-registered accounts always have a
// real `email` already, so this is only ever a fallback for them (`u.email ?? ...`).
export function deriveDemoEmail(name: string): string {
  // Collapse runs of separators (e.g. "Ir. Irwan" -> ". " -> one "." not two) and
  // trim leading/trailing dots — a name with an abbreviation like "Ir." otherwise
  // produces "ir..irwan...@pertamina.com", which the login/register routes' zod
  // email schema (rejects consecutive dots, RFC-adjacent) then refuses forever.
  const local = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return `${local}@pertamina.com`;
}
