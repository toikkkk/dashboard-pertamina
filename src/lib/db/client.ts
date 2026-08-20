// Neon's HTTP driver (not a pooled TCP client) — fits short-lived Next.js API route
// invocations on Vercel far better than a persistent connection pool would. See
// CLAUDE.md's "Backend / database" section for why this was chosen over `pg`/Prisma.
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Lazily initialized — DATABASE_URL is read on first actual query, not at module
// import time. Next.js injects env vars before any app code runs, so eager init
// would've been fine for API routes alone — but standalone scripts (scripts/*.ts)
// load .env.local via dotenv AFTER their `import` statements have already resolved
// (ESM hoists imports above other top-level statements), so an eager neon() call
// here would fire with an empty DATABASE_URL before dotenv had a chance to run.
// Laziness sidesteps that ordering issue for both callers, and still fails at
// request/script time with a clear connection error if DATABASE_URL is genuinely
// unset — never silently.
let cached: NeonHttpDatabase<typeof schema> | undefined;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (!cached) {
    cached = drizzle(neon(process.env.DATABASE_URL ?? ""), { schema });
  }
  return cached;
}

export const db: NeonHttpDatabase<typeof schema> = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
