import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { manifestRepo } from "@/server/repositories";
import { checkServerPermission } from "@/shared/lib/rbac-utils";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  const perm = checkServerPermission(session, "manifest", "approve");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const data = await manifestRepo.submit(params.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
