ALTER TABLE "users" ADD COLUMN "requested_role" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "requested_location" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_requested_location_locations_name_fk" FOREIGN KEY ("requested_location") REFERENCES "public"."locations"("name") ON DELETE no action ON UPDATE no action;