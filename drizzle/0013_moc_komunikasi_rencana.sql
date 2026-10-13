-- MOC tahap D Komunikasi + E.1 Rencana Implementasi (PRD moc-tahap-lanjut, milestone 1).
-- HANYA menambah kolom nullable (NULL = belum dicatat); aman dijalankan ulang.
ALTER TABLE "moc_requests" ADD COLUMN IF NOT EXISTS "communication" jsonb;
ALTER TABLE "moc_requests" ADD COLUMN IF NOT EXISTS "implementation_plan" jsonb;
