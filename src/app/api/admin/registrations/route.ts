import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { registrationRepo, auditRepo } from "@/server/repositories";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "jamaah", "view");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") ?? undefined;
  const paketId = searchParams.get("paketId") ?? undefined;
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  const result = await registrationRepo.findAll({ status, paketId, limit, offset });

  return NextResponse.json({ success: true, data: result.data, total: result.total });
}

// DELETE /api/admin/registrations — Menghapus riwayat pendaftaran secara keseluruhan
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "jamaah", "delete");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") ?? undefined;

  try {
    const res = await registrationRepo.deleteAll(status);

    try {
      await auditRepo.create({
        userId: session.user.id!,
        userName: session.user.name ?? "Unknown",
        role: session.user.role as any,
        module: "jamaah",
        action: "registration.delete_all",
        detail: `Menghapus seluruh riwayat pendaftaran${status ? ` dengan status ${status}` : ""}. Total dihapus: ${res.count} data.`,
        entityId: "ALL",
        entityType: "RegistrationRequest",
      });
    } catch { /* non-critical */ }

    return NextResponse.json({
      success: true,
      message: `Berhasil menghapus ${res.count} riwayat pendaftaran secara keseluruhan.`,
      count: res.count,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
