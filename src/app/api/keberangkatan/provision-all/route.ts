import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { provisionAllUnprovisionedPackages } from "@/server/storage/google-drive";

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const perm = checkServerPermission(session, "keberangkatan", "edit");
  if (!perm.allowed) {
    return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });
  }

  try {
    const result = await provisionAllUnprovisionedPackages();
    return NextResponse.json({
      success: true,
      message: `Pemeriksaan selesai. ${result.provisioned} dari ${result.total} paket berhasil di-provisioning ke Google Drive.`,
      data: result,
    });
  } catch (error: any) {
    console.error("[POST /api/keberangkatan/provision-all] Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Terjadi kesalahan saat memproses batch provisioning." },
      { status: 500 }
    );
  }
}
