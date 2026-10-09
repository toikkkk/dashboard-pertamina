// Sampah dokumen: lama simpan dan bentuk data yang dikirim ke halaman Sampah. Murni (tanpa DB) supaya
// dipakai server dan klien dengan angka yang sama.
export const TRASH_RETENTION_DAYS = 30;
/** Sisa hari (<=) yang ditandai mendesak: lencana sidebar dan penanda merah di halaman Sampah. */
export const TRASH_URGENT_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Waktu penghapusan permanen otomatis untuk dokumen yang masuk Sampah pada `deletedAt`. */
export function trashPurgeAt(deletedAt: Date | string): Date {
  return new Date(new Date(deletedAt).getTime() + TRASH_RETENTION_DAYS * DAY_MS);
}

/** Sisa hari (dibulatkan ke atas, minimum 0) sebelum dihapus permanen. */
export function trashDaysLeft(deletedAt: Date | string, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((trashPurgeAt(deletedAt).getTime() - now.getTime()) / DAY_MS));
}

export interface TrashedDocument {
  id: string;
  documentNumber: string;
  title: string;
  location: string;
  categoryName?: string;
  currentVersion: string;
  issueDate: string;
  fileUrl: string;
  fileName?: string;
  deletedAt: string; // ISO
  deletedByName: string | null;
  purgeAt: string; // ISO
  daysLeft: number;
  /** Boleh memulihkan / menghapus permanen (Admin Regional, atau user terminal dokumen itu). */
  canManage: boolean;
}
