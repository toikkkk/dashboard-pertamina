import { NextResponse } from "next/server";
import { destroySession, getSessionUser } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api/respond";

export async function POST(req: Request) {
  return withErrorHandling(async () => {
    const u = await getSessionUser();
    if (u) await logAudit(req, { id: u.id, name: u.name, email: u.email }, "logout", { location: u.location });
    await destroySession();
    return NextResponse.json({ ok: true });
  });
}
