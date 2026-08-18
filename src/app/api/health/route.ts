import { NextResponse } from "next/server";
import { isGoogleDriveConfigured, createPackageFolderHierarchy, createGoogleDriveAdapter } from "@/server/storage/google-drive";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const gdriveStatus = {
    isConfigured: false,
    folderIdEnv: process.env.GOOGLE_DRIVE_FOLDER_ID ? `${process.env.GOOGLE_DRIVE_FOLDER_ID.slice(0, 5)}...` : null,
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasRefreshToken: !!process.env.GOOGLE_REFRESH_TOKEN,
    testUploadResult: null as any,
    error: null as any,
  };

  try {
    gdriveStatus.isConfigured = isGoogleDriveConfigured();
    if (gdriveStatus.isConfigured) {
      const year = new Date().getFullYear();
      const registry = await createPackageFolderHierarchy(year, "08 - AGUSTUS 2026", "PAKET TEST DRIVE");
      const adapter = createGoogleDriveAdapter();
      const dummyBuffer = Buffer.from("GOOGLE DRIVE HEALTH CHECK TEST FILE");
      const uploadRes = await adapter.upload("health_check_test.txt", dummyBuffer, "text/plain", registry.formulirPendaftaran);
      gdriveStatus.testUploadResult = { success: true, fileId: uploadRes, formulirFolderId: registry.formulirPendaftaran };
    }
  } catch (err: any) {
    gdriveStatus.error = err?.message || String(err);
  }

  return NextResponse.json(
    {
      status: "healthy",
      service: "vtu-operasional",
      timestamp: new Date().toISOString(),
      gdrive: gdriveStatus,
    },
    { status: 200 }
  );
}
