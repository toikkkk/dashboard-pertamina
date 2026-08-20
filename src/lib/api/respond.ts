// Shared error → HTTP-response mapping so every route handler stays a few lines:
// `return withErrorHandling(async () => { ... throw new ForbiddenError() ... })`.
// This is the first point real untrusted input enters this app (previously
// everything was client-trusted local state) — zod validation errors are mapped
// to 400 explicitly rather than falling through to a generic 500.
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/rbac";

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  if (err instanceof ZodError) {
    return NextResponse.json({ error: "Input tidak valid.", issues: err.issues }, { status: 400 });
  }
  console.error(err);
  return NextResponse.json({ error: "Terjadi kesalahan pada server." }, { status: 500 });
}

export async function withErrorHandling(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err) {
    return errorResponse(err);
  }
}
