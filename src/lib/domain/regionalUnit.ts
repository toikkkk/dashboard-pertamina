// Unit "Regional Jatimbalinus": tempat MOC level regional (fungsi-fungsi di kantor regional juga dapat mengajukan
// MOC — jawaban client 2026-10-12; aturan peran mengikuti TKO B13.3-07 Tabel 3 kolom "Region / AP").
//
// Secara teknis unit ini satu baris di tabel `locations` (locationType "REG") supaya seluruh mesin MOC yang berbasis
// lokasi (daftar, hak akses, pilihan Reviewer/Approver dari akun lokasi yang sama) bekerja tanpa percabangan baru.
// PSI TIDAK ADA di tingkat regional (keputusan rapat 18 Sep 2026), jadi unit ini disembunyikan dari semua tampilan
// PSI (Direktori, kepatuhan, unggah, arsip) — lihat `psiStore.locations` vs `allLocations`.
export const REGIONAL_UNIT_NAME = "Regional Jatimbalinus";
export const REGIONAL_UNIT_TYPE = "REG" as const;

export function isRegionalUnit(location: string | null | undefined): boolean {
  return location === REGIONAL_UNIT_NAME;
}
