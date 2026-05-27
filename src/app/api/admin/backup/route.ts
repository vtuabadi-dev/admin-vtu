import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { runDatabaseBackup, runStorageBackup, listBackups } from "@/server/services/backup.service";
import { checkServerPermission } from "@/shared/lib/rbac-utils";

export async function GET() {
  const session = await auth();
  const perm = checkServerPermission(session, "backup", "view");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const backups = await listBackups();
    return NextResponse.json({ success: true, data: backups });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const perm = checkServerPermission(session, "backup", "create");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const body = await request.json().catch(() => ({}));
    const type = body.type || "full";
    const target = body.target || "database";

    if (target === "storage") {
      const record = await runStorageBackup();
      return NextResponse.json({ success: true, data: record });
    }

    const record = await runDatabaseBackup(type);
    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
