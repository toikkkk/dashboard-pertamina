// Pure-JS bcrypt (no native build step) — chosen over native bcrypt/argon2 bindings
// specifically to avoid Vercel build friction during this project's fast-turnaround
// one-month infra trial. See CLAUDE.md's "Backend / database" section for the
// full rationale; @node-rs/argon2 is the noted future upgrade once infra is proven.
import bcrypt from "bcryptjs";

// Cost 10 (was 12) since 2026-09-30: bcryptjs is pure JS, so its CPU-bound hashing
// work runs on Node's single main thread — a stress test with 120 concurrent
// logins at cost 12 averaged ~45s per login (all of them queueing for the same
// thread). Cost 10 is ~4x cheaper and still well within OWASP's current minimum
// guidance; login is also rate-limited (5 failed attempts/15min) independent of
// cost, which is the primary defense against brute-force regardless of this value.
const SALT_ROUNDS = 10;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
