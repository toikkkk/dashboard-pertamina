-- Ganti email lewat konfirmasi di alamat baru: token verifikasi bisa membawa "email baru" yang baru berlaku
-- setelah tautannya dibuka. Aditif: kolom nullable.
ALTER TABLE "email_verification_tokens" ADD COLUMN IF NOT EXISTS "new_email" text;
