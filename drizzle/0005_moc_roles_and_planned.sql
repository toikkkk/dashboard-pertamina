ALTER TABLE "moc_requests" ADD COLUMN "planned_reviewers" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "moc_requests" ADD COLUMN "planned_approver_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "moc_roles" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "moc_function" text;--> statement-breakpoint
ALTER TABLE "moc_requests" ADD CONSTRAINT "moc_requests_planned_approver_id_users_id_fk" FOREIGN KEY ("planned_approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;