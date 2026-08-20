import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/api/respond";

export async function GET() {
  return withErrorHandling(async () => {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ user: null }, { status: 200 });
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      location: user.location,
      isRegionalAdmin: user.isRegionalAdmin,
    });
  });
}
