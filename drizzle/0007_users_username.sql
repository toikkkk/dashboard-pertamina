ALTER TABLE "users" ADD COLUMN "username" text;--> statement-breakpoint
UPDATE "users" u SET "username" = s.uname FROM (
  SELECT id, CASE WHEN rn = 1 THEN base ELSE base || rn END AS uname FROM (
    SELECT id, base, row_number() OVER (PARTITION BY base ORDER BY created_at, id) AS rn FROM (
      SELECT id, created_at, CASE WHEN length(b) < 3 THEN b || 'user' ELSE b END AS base FROM (
        SELECT id, created_at, left(regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9._-]', '', 'g'), 26) AS b FROM "users"
      ) x
    ) y
  ) z
) s WHERE u."id" = s.id AND u."username" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_lower_idx" ON "users" USING btree (lower("username"));