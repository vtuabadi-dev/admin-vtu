import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { clusterRepo } from "@/server/repositories/master/cluster.repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
  const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : undefined;

  try {
    const result = await clusterRepo.findAll({ search, limit, offset });
    return NextResponse.json({ success: true, data: result.data, total: result.total });
  } catch (error: any) {
    console.error("[GET /api/master/clusters] Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    if (!body.nama) {
      return NextResponse.json({ success: false, message: "Nama Klaster wajib diisi" }, { status: 400 });
    }

    const created = await clusterRepo.create(body);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/master/clusters] Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
