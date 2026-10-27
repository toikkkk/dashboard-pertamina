// Cek kesehatan untuk pemantau ketersediaan (UptimeRobot, Vercel, dan sejenisnya). Publik dan sengaja minim: hanya
// menjawab apakah aplikasi dan database hidup, tanpa data apa pun. Tidak di-cache.
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  let database = "ok";
  try {
    await db.execute(sql`select 1`);
  } catch {
    database = "gagal";
  }
  return NextResponse.json({ status: database === "ok" ? "ok" : "bermasalah", database }, { status: database === "ok" ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
