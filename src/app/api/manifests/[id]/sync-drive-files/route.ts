import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { prisma } from "@/server/db/client";
import { syncPackageDocumentFileNamesToDrive } from "@/server/services/manifest-drive-sync.service";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const perm = checkServerPermission(session, "manifest", "edit");
  if (!perm.allowed) {
    return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });
  }

  try {
    const id = params.id;
    let keberangkatanId = id;

    // Check if ID is a Manifest ID
    const manifest = await prisma.manifest.findUnique({
      where: { id },
      select: { keberangkatanId: true },
    });
    if (manifest?.keberangkatanId) {
      keberangkatanId = manifest.keberangkatanId;
    }

    const result = await syncPackageDocumentFileNamesToDrive(keberangkatanId);

    return NextResponse.json({
      success: true,
      message: `Sinkronisasi selesai: ${result.renamedCount} file dokumen berhasil diperbarui namanya di Google Drive.`,
      data: result,
    });
  } catch (error) {
    console.error("[POST /api/manifests/[id]/sync-drive-files] Error:", error);
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
