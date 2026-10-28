-- Deskripsi dokumen: keterangan bebas yang bisa diubah Initiator lokasi dan tercatat nilai lama → baru di Riwayat Proses.
-- Aditif: satu kolom dengan nilai bawaan kosong (aman dijalankan ulang; kode lama mengabaikan kolom ini).
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "deskripsi" text NOT NULL DEFAULT '';
