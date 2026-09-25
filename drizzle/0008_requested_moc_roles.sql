ALTER TABLE "users" ADD COLUMN "requested_moc_roles" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "requested_moc_function" text;