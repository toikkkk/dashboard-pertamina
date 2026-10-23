// Pulihkan MOC dari Sampah (khusus Admin Regional).
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api/respond";
import { restoreMoc } from "@/lib/api/mocTrash";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    await restoreMoc(req, user, params.id);
    return NextResponse.json({ ok: true });
  });
}
