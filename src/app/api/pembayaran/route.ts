import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { pembayaranRepo, auditRepo } from "@/server/repositories";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "pembayaran", "view");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const groupId = searchParams.get("groupId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
  const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined;

  try {
    const result = await pembayaranRepo.findAll({ groupId, status, limit, offset });
    return NextResponse.json({ success: true, data: result.data, total: result.total });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "pembayaran", "create");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const body = await request.json();
    const data = await pembayaranRepo.create(body);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

// DELETE /api/pembayaran — Bulk delete payments / trial data
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "pembayaran", "delete");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") ?? undefined;

  try {
    const result = await pembayaranRepo.deleteAll({ status });

    try {
      await auditRepo.create({
        userId: session.user.id!,
        userName: session.user.name ?? "Unknown",
        role: session.user.role as any,
        module: "pembayaran",
        action: "pembayaran.bulk_delete",
        detail: `Menghapus seluruh antrian data pembayaran percobaan (${result.count} data).`,
        entityId: "ALL",
        entityType: "Pembayaran",
      });
    } catch { /* non-critical */ }

    return NextResponse.json({
      success: true,
      message: `Berhasil menghapus ${result.count} data pembayaran percobaan.`,
      count: result.count,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
