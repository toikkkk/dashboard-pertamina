-- MOC tahap F Pemantauan, G Tinjauan Akhir, H Penutupan (Lampiran 6 dan 7).
-- HANYA menambah kolom jsonb nullable (NULL = belum dicatat); aman dijalankan ulang.
ALTER TABLE "moc_requests" ADD COLUMN IF NOT EXISTS "monitoring" jsonb;
ALTER TABLE "moc_requests" ADD COLUMN IF NOT EXISTS "final_review" jsonb;
ALTER TABLE "moc_requests" ADD COLUMN IF NOT EXISTS "closure" jsonb;
