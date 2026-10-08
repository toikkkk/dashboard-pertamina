-- Autentikasi dua faktor (TOTP) + verifikasi email. HANYA menambah kolom/tabel (aman dijalankan ulang).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified_at" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_secret_enc" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_enabled_at" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_recovery_hashes" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_last_step" bigint;
-- Akun yang sudah ada sebelum fitur ini dianggap terverifikasi (agar tidak ada yang terkunci).
UPDATE "users" SET "email_verified_at" = "created_at" WHERE "email_verified_at" IS NULL;
CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL UNIQUE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "mfa_challenges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL UNIQUE,
  "attempts" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL
);
