CREATE TABLE "moc_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"moc_id" uuid NOT NULL,
	"slot" text NOT NULL,
	"review_id" uuid,
	"file_id" uuid NOT NULL,
	"uploaded_by" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moc_evidence_slot_check" CHECK ("moc_evidence"."slot" IN ('initiator','reviewer','approver','controller'))
);
--> statement-breakpoint
CREATE TABLE "moc_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"moc_id" uuid NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_user_id" uuid,
	"actor_name" text NOT NULL,
	"actor_role" text NOT NULL,
	"action" text NOT NULL,
	"notes" text,
	"from_state" text,
	"to_state" text
);
--> statement-breakpoint
CREATE TABLE "moc_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"moc_number" text,
	"location" text NOT NULL,
	"unit_operasi" text DEFAULT '' NOT NULL,
	"fungsi" text DEFAULT '' NOT NULL,
	"region" text DEFAULT 'Jatimbalinus' NOT NULL,
	"anggaran_type" text DEFAULT '' NOT NULL,
	"tanggal" date NOT NULL,
	"judul" text DEFAULT '' NOT NULL,
	"latar_belakang" text DEFAULT '' NOT NULL,
	"change_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sifat_perubahan" text DEFAULT 'Permanen' NOT NULL,
	"valid_from" date,
	"valid_until" date,
	"deskripsi" text DEFAULT '' NOT NULL,
	"proses_terdampak" text DEFAULT '' NOT NULL,
	"peraturan_relevan" text DEFAULT '' NOT NULL,
	"stakeholder_reviewer" text DEFAULT '' NOT NULL,
	"studi_kajian" text DEFAULT '' NOT NULL,
	"usulan_performer" text DEFAULT '' NOT NULL,
	"initiator_name" text DEFAULT '' NOT NULL,
	"initiator_jabatan" text DEFAULT '' NOT NULL,
	"risk_impacts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hazard_description" text DEFAULT '' NOT NULL,
	"severity" integer,
	"probability" integer,
	"risk_level" text,
	"plant_barriers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"process_barriers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"people_barriers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"upside_gain" text DEFAULT '' NOT NULL,
	"downside_loss" text DEFAULT '' NOT NULL,
	"register_status" text DEFAULT 'Inisiasi & Validasi' NOT NULL,
	"validation_state" text DEFAULT 'draft' NOT NULL,
	"round" integer DEFAULT 1 NOT NULL,
	"approver_user_id" uuid,
	"performer_user_id" uuid,
	"performer_name" text,
	"approver_note" text,
	"approved_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moc_requests_moc_number_unique" UNIQUE("moc_number"),
	CONSTRAINT "moc_sifat_check" CHECK ("moc_requests"."sifat_perubahan" IN ('Permanen','Sementara','Darurat')),
	CONSTRAINT "moc_risk_level_check" CHECK ("moc_requests"."risk_level" IS NULL OR "moc_requests"."risk_level" IN ('L','M','H')),
	CONSTRAINT "moc_severity_check" CHECK ("moc_requests"."severity" IS NULL OR ("moc_requests"."severity" BETWEEN 1 AND 5)),
	CONSTRAINT "moc_probability_check" CHECK ("moc_requests"."probability" IS NULL OR ("moc_requests"."probability" BETWEEN 1 AND 5)),
	CONSTRAINT "moc_register_status_check" CHECK ("moc_requests"."register_status" IN ('Inisiasi & Validasi','Implementasi','Pemantauan','Tinjauan Akhir','Closed')),
	CONSTRAINT "moc_validation_state_check" CHECK ("moc_requests"."validation_state" IN ('draft','in_review','returned','pending_approval','rejected','approved','registered'))
);
--> statement-breakpoint
CREATE TABLE "moc_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"moc_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"function_label" text NOT NULL,
	"reviewer_user_id" uuid,
	"reviewer_name" text NOT NULL,
	"reviewer_jabatan" text DEFAULT '' NOT NULL,
	"outcome" text DEFAULT 'Pending' NOT NULL,
	"recommendation" text DEFAULT '' NOT NULL,
	"reviewed_at" timestamp with time zone,
	CONSTRAINT "moc_review_outcome_check" CHECK ("moc_reviews"."outcome" IN ('Pending','Sesuai','Perlu Perubahan'))
);
--> statement-breakpoint
ALTER TABLE "moc_evidence" ADD CONSTRAINT "moc_evidence_moc_id_moc_requests_id_fk" FOREIGN KEY ("moc_id") REFERENCES "public"."moc_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_evidence" ADD CONSTRAINT "moc_evidence_review_id_moc_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."moc_reviews"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_evidence" ADD CONSTRAINT "moc_evidence_file_id_file_registry_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file_registry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_evidence" ADD CONSTRAINT "moc_evidence_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_history" ADD CONSTRAINT "moc_history_moc_id_moc_requests_id_fk" FOREIGN KEY ("moc_id") REFERENCES "public"."moc_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_history" ADD CONSTRAINT "moc_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_requests" ADD CONSTRAINT "moc_requests_location_locations_name_fk" FOREIGN KEY ("location") REFERENCES "public"."locations"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_requests" ADD CONSTRAINT "moc_requests_approver_user_id_users_id_fk" FOREIGN KEY ("approver_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_requests" ADD CONSTRAINT "moc_requests_performer_user_id_users_id_fk" FOREIGN KEY ("performer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_requests" ADD CONSTRAINT "moc_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_reviews" ADD CONSTRAINT "moc_reviews_moc_id_moc_requests_id_fk" FOREIGN KEY ("moc_id") REFERENCES "public"."moc_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moc_reviews" ADD CONSTRAINT "moc_reviews_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;