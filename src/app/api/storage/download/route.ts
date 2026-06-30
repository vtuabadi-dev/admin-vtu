import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { getStorageAdapter } from "@/server/storage";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const perm = checkServerPermission(session, "dokumen", "view");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  const fileId = request.nextUrl.searchParams.get("id");
  if (!fileId) {
    return NextResponse.json({ success: false, message: "id query parameter is required" }, { status: 400 });
  }

  try {
    const storage = getStorageAdapter();
    const buffer = await storage.download(fileId);

    // Detect content type from magic bytes
    let contentType = "application/octet-stream";
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) contentType = "image/jpeg";
    else if (buffer[0] === 0x89 && buffer[1] === 0x50) contentType = "image/png";
    else if (buffer[0] === 0x47 && buffer[1] === 0x49) contentType = "image/gif";
    else if (buffer[0] === 0x25 && buffer[1] === 0x50) contentType = "application/pdf";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
