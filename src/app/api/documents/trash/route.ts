// Daftar Sampah: dokumen yang dihapus dan masih bisa dipulihkan. Semua user yang sudah onboarded boleh MELIHAT
// semua lokasi (sama seperti Direktori); `canManage` per baris menandai siapa yang boleh memulihkan/menghapus
// permanen — keputusan itu dicek ulang di route restore/purge. `?summary=1` = hanya hitungan ringan untuk
// lencana sidebar (khusus dokumen yang boleh dikelola user ini).
import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { assertLocationRead } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";
import { loadTrashedDocuments } from "@/lib/api/documents";
import { trashSummaryForUser } from "@/lib/api/trash";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertLocationRead(user);
    if (req.nextUrl.searchParams.get("summary") === "1") return NextResponse.json(await trashSummaryForUser(user));
    return NextResponse.json(await loadTrashedDocuments(user));
  });
}
