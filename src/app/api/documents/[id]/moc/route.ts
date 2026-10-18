// MOC yang menandai dokumen ini sebagai terdampak (kartu "Terkait MOC" di halaman dokumen). Hak baca semua lokasi.
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { assertLocationRead } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";
import { loadMocsAffectingDoc } from "@/lib/api/mocAffected";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertLocationRead(user);
    return NextResponse.json({ items: await loadMocsAffectingDoc(params.id) });
  });
}
