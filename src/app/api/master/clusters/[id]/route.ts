import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { clusterRepo } from "@/server/repositories/master/cluster.repository";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const perm = checkServerPermission(session, "sistem", "edit");
  if (!perm.allowed) {
    return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });
  }

  try {
    const body = await request.json();
    const updated = await clusterRepo.update(params.id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[PUT /api/master/clusters/[id]] Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const perm = checkServerPermission(session, "sistem", "delete");
  if (!perm.allowed) {
    return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });
  }

  try {
    await clusterRepo.delete(params.id);
    return NextResponse.json({ success: true, message: "Klaster berhasil dihapus" });
  } catch (error: any) {
    console.error("[DELETE /api/master/clusters/[id]] Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
