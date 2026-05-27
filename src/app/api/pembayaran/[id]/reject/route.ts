import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { pembayaranRepo } from "@/server/repositories";
import { checkServerPermission } from "@/shared/lib/rbac-utils";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  const perm = checkServerPermission(session, "pembayaran", "approve");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const { alasanReject } = await request.json();
    if (!alasanReject) return NextResponse.json({ success: false, message: "alasanReject is required" }, { status: 400 });
    const data = await pembayaranRepo.reject(params.id, alasanReject, session!.user!.name ?? session!.user!.email ?? "system");
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
