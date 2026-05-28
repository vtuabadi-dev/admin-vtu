import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { getHealthReport } from "@/server/lib/health";

export async function GET() {
  const session = await auth();
  const perm = checkServerPermission(session, "sistem", "view");
  if (!perm.allowed)
    return NextResponse.json(
      { success: false, message: perm.reason },
      { status: 403 },
    );

  const health = await getHealthReport();

  return NextResponse.json({ success: true, data: health });
}
