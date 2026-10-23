// Daftar MOC di Sampah: khusus Admin Regional (satu-satunya yang boleh menghapus MOC).
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { assertRegionalAdmin } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";
import { loadTrashedMocs } from "@/lib/api/mocTrash";

export async function GET() {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    assertRegionalAdmin(user);
    return NextResponse.json(await loadTrashedMocs());
  });
}
