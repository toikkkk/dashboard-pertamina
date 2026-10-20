-- MOC Gelombang B: kolom halt (penundaan/penghentian) dan dua status baru pada validation_state.
-- Aditif: kolom nullable + CHECK diperlebar (nilai lama tetap sah).
ALTER TABLE "moc_requests" ADD COLUMN IF NOT EXISTS "halt" jsonb;
ALTER TABLE "moc_requests" DROP CONSTRAINT IF EXISTS "moc_validation_state_check";
ALTER TABLE "moc_requests" ADD CONSTRAINT "moc_validation_state_check" CHECK (validation_state IN ('draft','in_review','returned','pending_approval','rejected','approved','registered','halt_requested','halted'));
