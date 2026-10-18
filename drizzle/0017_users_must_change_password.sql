-- Wajib ganti kata sandi saat login pertama (akun sungguhan). Kolom baru dengan default false: aman bagi kode lama.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_change_password" boolean DEFAULT false NOT NULL;
