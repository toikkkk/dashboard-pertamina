-- Sampah dokumen: "hapus" = tandai deleted_at; penghapusan permanen dilakukan cron setelah 30 hari.
-- HANYA menambah kolom/indeks (aman dijalankan ulang; kode lama mengabaikan kolom ini).
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "deleted_by_id" uuid;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "deleted_by_name" text;
CREATE INDEX IF NOT EXISTS "documents_deleted_at_idx" ON "documents" ("deleted_at") WHERE "deleted_at" IS NOT NULL;
