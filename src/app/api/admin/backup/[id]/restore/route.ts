import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { restoreBackup } from "@/server/services/backup.service";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const perm = checkServerPermission(session, "backup", "create");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const result = await restoreBackup(params.id);
    return NextResponse.json(result, { status: result.success ? 200 : 404 });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
