import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api/respond";

export async function POST() {
  return withErrorHandling(async () => {
    await destroySession();
    return NextResponse.json({ ok: true });
  });
}
