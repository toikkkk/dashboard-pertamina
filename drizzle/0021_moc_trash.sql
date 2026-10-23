-- Sampah MOC: MOC yang dihapus Admin Regional dipindah ke Sampah (30 hari) dan bisa dipulihkan.
-- Aditif: tiga kolom boleh kosong.
ALTER TABLE "moc_requests" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
ALTER TABLE "moc_requests" ADD COLUMN IF NOT EXISTS "deleted_by_id" uuid;
ALTER TABLE "moc_requests" ADD COLUMN IF NOT EXISTS "deleted_by_name" text;
