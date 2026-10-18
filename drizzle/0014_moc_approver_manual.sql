-- MOC: Approver tanpa akun (diketik manual). Review/keputusannya dicatat Initiator atau Controller atas namanya.
-- HANYA menambah kolom nullable; aman dijalankan ulang.
ALTER TABLE "moc_requests" ADD COLUMN IF NOT EXISTS "approver_manual_name" text;
ALTER TABLE "moc_requests" ADD COLUMN IF NOT EXISTS "approver_manual_jabatan" text;
