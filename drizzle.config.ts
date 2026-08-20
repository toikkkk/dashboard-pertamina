import { config as loadEnv } from "dotenv";
import type { Config } from "drizzle-kit";

// Reads DATABASE_URL from .env.local at generate/push time (see .env.example).
// `drizzle-kit generate` only reads the schema to produce SQL — it doesn't need a
// live connection, so this file works even before real Neon credentials exist.
// drizzle-kit's CLI doesn't auto-load .env.local (that's a Next.js convention, not
// a drizzle-kit one) — must load it explicitly, same as scripts/*.ts do.
loadEnv({ path: ".env.local" });

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
} satisfies Config;
