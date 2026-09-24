ALTER TABLE "moc_evidence" DROP CONSTRAINT "moc_evidence_slot_check";--> statement-breakpoint
ALTER TABLE "moc_evidence" ADD COLUMN "stage" text;--> statement-breakpoint
ALTER TABLE "moc_evidence" ADD CONSTRAINT "moc_evidence_slot_check" CHECK ("moc_evidence"."slot" IN ('initiator','reviewer','approver','controller','lampiran'));