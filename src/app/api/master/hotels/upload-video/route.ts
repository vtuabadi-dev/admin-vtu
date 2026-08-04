import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { getStorageAdapter } from "@/server/storage";
import { createHotelVideoFolderHierarchy, isGoogleDriveConfigured } from "@/server/storage/google-drive";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const perm = checkServerPermission(session, "sistem", "edit");
    if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const cityName = (formData.get("cityName") as string) || "Makkah";
    const hotelName = (formData.get("hotelName") as string) || "Hotel";

    if (!file) {
      return NextResponse.json({ success: false, message: "File video tidak ditemukan" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Get or create target Google Drive folder hierarchy: VIDEO HOTEL / MAKKAH|MADINAH / HOTEL NAME
    let targetFolderId: string | undefined = undefined;
    if (isGoogleDriveConfigured()) {
      targetFolderId = await createHotelVideoFolderHierarchy(cityName, hotelName);
    }

    // 2. Upload video using Storage Adapter
    const storage = getStorageAdapter();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const storagePath = `video-hotel/${hotelName.toLowerCase().replace(/[^a-z0-9]/g, "-")}/${cleanFileName}`;
    
    const fileId = await storage.upload(storagePath, buffer, file.type || "video/mp4", targetFolderId);
    const videoUrl = await storage.getUrl(fileId);

    return NextResponse.json({
      success: true,
      data: {
        fileId,
        videoUrl,
        fileName: file.name,
      },
    });
  } catch (error: any) {
    console.error("[UPLOAD HOTEL VIDEO ERROR]", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Gagal mengunggah video hotel" },
      { status: 500 }
    );
  }
}
