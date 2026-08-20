// Pure-JS bcrypt (no native build step) — chosen over native bcrypt/argon2 bindings
// specifically to avoid Vercel build friction during this project's fast-turnaround
// one-month infra trial. See CLAUDE.md's "Backend / database" section for the
// full rationale; @node-rs/argon2 is the noted future upgrade once infra is proven.
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
