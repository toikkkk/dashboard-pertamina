// Daftar Sampah: dokumen yang dihapus dan masih bisa dipulihkan. Semua user yang sudah onboarded boleh MELIHAT
// semua lokasi (sama seperti Direktori); `canManage` per baris menandai siapa yang boleh memulihkan/menghapus
// permanen — keputusan itu dicek ulang di route restore/purge.
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { assertLocationRead } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";
import { loadTrashedDocuments } from "@/lib/api/documents";

export async function GET() {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertLocationRead(user);
    return NextResponse.json(await loadTrashedDocuments(user));
  });
}
