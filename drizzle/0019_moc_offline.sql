-- MOC offline: tanda MOC yang dicatat dari dokumen offline (tidak diproses di alur aplikasi).
-- Aditif: kolom boolean dengan default false.
ALTER TABLE "moc_requests" ADD COLUMN IF NOT EXISTS "is_offline" boolean DEFAULT false NOT NULL;
