// Sampah MOC: Hapus MOC (khusus Admin Regional) memindahkan MOC ke Sampah selama TRASH_RETENTION_DAYS hari; di sana ia
// bisa dipulihkan atau dihapus permanen. MOC di Sampah dianggap tidak ada oleh semua jalur baca/ubah biasa
// (loadMocItem, loadMocList, PSI terdampak). Nomor MoC-nya tetap terpakai selama masih di Sampah, jadi tidak ada nomor ganda.
// Hapus permanen: baris MOC beserta review, riwayat, bukti, dan PSI terdampak (CASCADE) + berkas bukti yang tak dipakai data lain.
import { and, desc, eq, isNotNull, isNull, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mocEvidence, mocRequests } from "@/lib/db/schema";
import { HttpError } from "@/lib/api/respond";
import { removeUnusedFiles } from "@/lib/api/trash";
import { assertRegionalAdmin } from "@/lib/auth/rbac";
import type { SessionUser } from "@/lib/auth/session";
import { TRASH_RETENTION_DAYS, trashDaysLeft, trashPurgeAt, type TrashedMoc } from "@/lib/domain/trash";
import { logAudit } from "@/lib/audit";

type MocRow = typeof mocRequests.$inferSelect;
const actorOf = (u: SessionUser) => ({ id: u.id, name: u.name, email: u.email });
const label = (m: MocRow) => `${m.mocNumber ?? "Belum bernomor"} ${m.judul}`.trim();

async function rowById(id: string): Promise<MocRow | null> {
  const [row] = await db.select().from(mocRequests).where(eq(mocRequests.id, id)).limit(1);
  return row ?? null;
}

/** MOC aktif -> Sampah. Mengembalikan waktu hapus permanen otomatis. */
export async function moveMocToTrash(req: Request, user: SessionUser, id: string): Promise<Date> {
  assertRegionalAdmin(user);
  const row = await rowById(id);
  if (!row || row.deletedAt) throw new HttpError(404, "MOC tidak ditemukan.");
  const now = new Date();
  await db.update(mocRequests).set({ deletedAt: now, deletedById: user.id, deletedByName: user.name }).where(and(eq(mocRequests.id, id), isNull(mocRequests.deletedAt)));
  const purgeAt = trashPurgeAt(now);
  await logAudit(req, actorOf(user), "moc.dihapus", {
    targetType: "moc",
    targetId: id,
    targetLabel: label(row),
    location: row.location,
    detail: { keSampah: true, nomor: row.mocNumber, judul: row.judul, status: row.registerStatus, alur: row.validationState, hapusPermanenOtomatis: purgeAt.toISOString().slice(0, 10) },
  });
  return purgeAt;
}

/** Sampah -> aktif lagi. */
export async function restoreMoc(req: Request, user: SessionUser, id: string): Promise<void> {
  assertRegionalAdmin(user);
  const row = await rowById(id);
  if (!row || !row.deletedAt) throw new HttpError(404, "MOC tidak ada di Sampah.");
  await db.update(mocRequests).set({ deletedAt: null, deletedById: null, deletedByName: null }).where(and(eq(mocRequests.id, id), isNotNull(mocRequests.deletedAt)));
  await logAudit(req, actorOf(user), "moc.dipulihkan", { targetType: "moc", targetId: id, targetLabel: label(row), location: row.location });
}

/** Hapus baris MOC + berkas buktinya yang tak dipakai data lain. Dipakai tombol dan cron. */
export async function purgeMocRow(row: MocRow): Promise<{ filesRemoved: number; filesTotal: number }> {
  const ev = await db.select({ fileId: mocEvidence.fileId }).from(mocEvidence).where(eq(mocEvidence.mocId, row.id));
  const fileIds = Array.from(new Set(ev.map((e) => e.fileId)));
  await db.delete(mocRequests).where(eq(mocRequests.id, row.id));
  const filesRemoved = await removeUnusedFiles(fileIds);
  return { filesRemoved, filesTotal: fileIds.length };
}

/** Hapus permanen sekarang, hanya untuk MOC yang SUDAH di Sampah. */
export async function purgeMoc(req: Request, user: SessionUser, id: string): Promise<{ filesRemoved: number }> {
  assertRegionalAdmin(user);
  const row = await rowById(id);
  if (!row || !row.deletedAt) throw new HttpError(404, "MOC tidak ada di Sampah.");
  const { filesRemoved, filesTotal } = await purgeMocRow(row);
  await logAudit(req, actorOf(user), "moc.dihapus_permanen", {
    targetType: "moc",
    targetId: id,
    targetLabel: label(row),
    location: row.location,
    detail: { nomor: row.mocNumber, judul: row.judul, berkasDihapus: filesRemoved, berkasTotal: filesTotal },
  });
  return { filesRemoved };
}

/** Daftar MOC di Sampah (terbaru dihapus lebih dulu). */
export async function loadTrashedMocs(): Promise<TrashedMoc[]> {
  const rows = await db.select().from(mocRequests).where(isNotNull(mocRequests.deletedAt)).orderBy(desc(mocRequests.deletedAt));
  return rows.map((m) => ({
    id: m.id,
    mocNumber: m.mocNumber,
    judul: m.judul,
    location: m.location,
    registerStatus: m.registerStatus,
    validationState: m.validationState,
    isOffline: m.isOffline,
    deletedAt: m.deletedAt!.toISOString(),
    deletedByName: m.deletedByName,
    purgeAt: trashPurgeAt(m.deletedAt!).toISOString(),
    daysLeft: trashDaysLeft(m.deletedAt!),
  }));
}

/** MOC yang sudah lewat masa simpan (untuk tugas terjadwal). */
export async function dueMocs(limit: number): Promise<MocRow[]> {
  const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  return db.select().from(mocRequests).where(and(isNotNull(mocRequests.deletedAt), lt(mocRequests.deletedAt, cutoff))).limit(limit);
}
