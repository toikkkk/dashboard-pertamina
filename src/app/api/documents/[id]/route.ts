import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { assertLocationAccess } from "@/lib/auth/rbac";
import { withErrorHandling } from "@/lib/api/respond";
import { loadDocumentItem, getDocumentLocation } from "@/lib/api/documents";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const user = await requireSessionUser();
    const location = await getDocumentLocation(params.id);
    if (location === null) {
      return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
    }
    assertLocationAccess(user, location);

    const item = await loadDocumentItem(params.id);
    return NextResponse.json(item);
  });
}
