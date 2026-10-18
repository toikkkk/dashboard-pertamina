-- MOC Tahap 4: PSI terdampak per MOC (tautan ke dokumen Direktori, bukan salinan).
-- Tabel baru, aditif; aman dijalankan ulang.
CREATE TABLE IF NOT EXISTS "moc_affected_docs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "moc_id" uuid NOT NULL REFERENCES "moc_requests"("id") ON DELETE CASCADE,
  "document_id" uuid NOT NULL REFERENCES "documents"("id"),
  "baseline_version" text NOT NULL,
  "added_by" uuid REFERENCES "users"("id"),
  "added_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "moc_affected_docs_unique" UNIQUE ("moc_id", "document_id")
);
CREATE INDEX IF NOT EXISTS "moc_affected_docs_document_idx" ON "moc_affected_docs" ("document_id");
