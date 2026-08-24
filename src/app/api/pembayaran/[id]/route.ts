import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { pembayaranRepo, auditRepo } from "@/server/repositories";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const payment = await pembayaranRepo.findById(params.id);
  if (!payment) return NextResponse.json({ success: false, message: "Pembayaran tidak ditemukan" }, { status: 404 });

  return NextResponse.json({ success: true, data: payment });
}

// DELETE /api/pembayaran/[id]?cascade=true
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "pembayaran", "delete");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const cascade = searchParams.get("cascade") === "true";

  try {
    const payment = await pembayaranRepo.findById(params.id);
    if (!payment) return NextResponse.json({ success: false, message: "Data pembayaran tidak ditemukan" }, { status: 404 });

    await pembayaranRepo.delete(params.id, cascade);

    try {
      await auditRepo.create({
        userId: session.user.id!,
        userName: session.user.name ?? "Unknown",
        role: session.user.role as any,
        module: "pembayaran",
        action: "pembayaran.delete",
        detail: `Menghapus transaksi pembayaran ${payment.id} (Nominal: Rp ${payment.jumlah?.toLocaleString("id-ID")})${cascade ? " beserta grup & jamaah terkait" : ""}`,
        entityId: params.id,
        entityType: "Pembayaran",
      });
    } catch { /* non-critical */ }

    return NextResponse.json({
      success: true,
      message: "Data pembayaran berhasil dihapus",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
