CREATE TABLE "approval_routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"approver_role" text NOT NULL,
	"approver_name" text NOT NULL,
	"approver_user_id" uuid,
	"step_order" integer NOT NULL,
	"status" text NOT NULL,
	"action_date" date,
	"comment" text,
	CONSTRAINT "route_status_check" CHECK ("approval_routes"."status" IN ('Pending','Approved','Rejected'))
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_number" text NOT NULL,
	"title" text NOT NULL,
	"psi_type" text NOT NULL,
	"audit_type" text,
	"lifecycle_phase" text NOT NULL,
	"location" text NOT NULL,
	"current_version" text NOT NULL,
	"status" text NOT NULL,
	"issue_date" date NOT NULL,
	"expiry_date" date NOT NULL,
	"primary_file_id" uuid NOT NULL,
	"is_circular" boolean NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documents_document_number_unique" UNIQUE("document_number"),
	CONSTRAINT "lifecycle_phase_check" CHECK ("documents"."lifecycle_phase" IN ('Proyek','Operasi','Decommissioning')),
	CONSTRAINT "status_check" CHECK ("documents"."status" IN ('Draft','In Routing','Approved','Revision Required','Expired'))
);
--> statement-breakpoint
CREATE TABLE "file_registry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"r2_object_key" text NOT NULL,
	"original_relative_path" text NOT NULL,
	"original_filename" text NOT NULL,
	"category" text NOT NULL,
	"location_raw" text,
	"location_canonical" text,
	"path_segments" jsonb NOT NULL,
	"size_bytes" bigint NOT NULL,
	"mime_type" text NOT NULL,
	"checksum_sha256" text,
	"upload_status" text DEFAULT 'pending' NOT NULL,
	"needs_location_review" boolean DEFAULT false NOT NULL,
	"uploaded_by_user_id" uuid,
	"uploaded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "file_registry_r2_object_key_unique" UNIQUE("r2_object_key"),
	CONSTRAINT "file_registry_original_relative_path_unique" UNIQUE("original_relative_path"),
	CONSTRAINT "upload_status_check" CHECK ("file_registry"."upload_status" IN ('pending','uploaded','failed'))
);
--> statement-breakpoint
CREATE TABLE "history_diffs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"history_item_id" uuid NOT NULL,
	"field" text NOT NULL,
	"old_value" text NOT NULL,
	"new_value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "history_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_user_id" uuid,
	"actor_name" text NOT NULL,
	"actor_role" text NOT NULL,
	"location" text NOT NULL,
	"action" text NOT NULL,
	"notes" text,
	"file_id" uuid NOT NULL,
	"version" text NOT NULL,
	CONSTRAINT "action_check" CHECK ("history_items"."action" IN ('Created','Forwarded','Approved','Rejected','Extended Validity','Revised','Closed'))
);
--> statement-breakpoint
CREATE TABLE "location_aliases" (
	"raw_pattern" text PRIMARY KEY NOT NULL,
	"canonical_location" text
);
--> statement-breakpoint
CREATE TABLE "location_targets" (
	"location_name" text NOT NULL,
	"psi_type" text NOT NULL,
	"target" integer NOT NULL,
	CONSTRAINT "location_targets_location_name_psi_type_pk" PRIMARY KEY("location_name","psi_type")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"name" text PRIMARY KEY NOT NULL,
	"location_type" text NOT NULL,
	"region" text DEFAULT 'Jatimbalinus' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"location" text,
	"is_regional_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "approval_routes" ADD CONSTRAINT "approval_routes_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_routes" ADD CONSTRAINT "approval_routes_approver_user_id_users_id_fk" FOREIGN KEY ("approver_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_location_locations_name_fk" FOREIGN KEY ("location") REFERENCES "public"."locations"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_primary_file_id_file_registry_id_fk" FOREIGN KEY ("primary_file_id") REFERENCES "public"."file_registry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_registry" ADD CONSTRAINT "file_registry_location_canonical_locations_name_fk" FOREIGN KEY ("location_canonical") REFERENCES "public"."locations"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_registry" ADD CONSTRAINT "file_registry_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history_diffs" ADD CONSTRAINT "history_diffs_history_item_id_history_items_id_fk" FOREIGN KEY ("history_item_id") REFERENCES "public"."history_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history_items" ADD CONSTRAINT "history_items_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history_items" ADD CONSTRAINT "history_items_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history_items" ADD CONSTRAINT "history_items_file_id_file_registry_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file_registry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_aliases" ADD CONSTRAINT "location_aliases_canonical_location_locations_name_fk" FOREIGN KEY ("canonical_location") REFERENCES "public"."locations"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_targets" ADD CONSTRAINT "location_targets_location_name_locations_name_fk" FOREIGN KEY ("location_name") REFERENCES "public"."locations"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_location_locations_name_fk" FOREIGN KEY ("location") REFERENCES "public"."locations"("name") ON DELETE no action ON UPDATE no action;