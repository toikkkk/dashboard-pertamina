// Resend — transactional email for the password-reset flow. Lazily initialized, same
// reasoning as db/client.ts: this file is imported by API routes that must still build
// and typecheck before a real RESEND_API_KEY exists (see the "prepare infra before
// accounts exist" pattern used for Neon/R2 earlier in this project).
import { Resend } from "resend";

let cached: Resend | undefined;

export function getResendClient(): Resend {
  if (!cached) {
    cached = new Resend(process.env.RESEND_API_KEY ?? "");
  }
  return cached;
}

// Resend's sandbox sender — works without verifying a custom domain, but can only
// deliver to the email address the Resend account itself was signed up with. Once a
// real sending domain is verified (see .env.example), switch RESEND_FROM_EMAIL to
// something like "no-reply@<verified-domain>" — no code change needed beyond the env var.
export const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "PSIOneVision <onboarding@resend.dev>";
