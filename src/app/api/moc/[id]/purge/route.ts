// Hapus permanen MOC yang sudah di Sampah (khusus Admin Regional). Tidak dapat dibatalkan.
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api/respond";
import { purgeMoc } from "@/lib/api/mocTrash";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const { filesRemoved } = await purgeMoc(req, user, params.id);
    return NextResponse.json({ ok: true, filesRemoved });
  });
}
