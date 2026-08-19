import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { provisionPackageStorage } from "@/server/storage/google-drive";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const perm = checkServerPermission(session, "keberangkatan", "edit");
  if (!perm.allowed) {
    return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });
  }

  try {
    const packageId = params.id;
    const registry = await provisionPackageStorage(packageId);

    if (!registry) {
      return NextResponse.json(
        { success: false, message: "Gagal membuat folder Google Drive (pastikan OAuth/Environment Variable Google Drive sudah terkonfigurasi)." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Berhasil membuat dan menyinkronkan seluruh folder Google Drive paket!",
      data: registry,
    });
  } catch (error: any) {
    console.error("[POST /api/keberangkatan/[id]/provision] Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Terjadi kesalahan sistem saat provisioning Google Drive." },
      { status: 500 }
    );
  }
}
