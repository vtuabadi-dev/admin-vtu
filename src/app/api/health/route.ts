import { NextResponse } from "next/server";
import { isGoogleDriveConfigured } from "@/server/storage/google-drive";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      status: "healthy",
      service: "vtu-operasional",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      gdriveConfigured: isGoogleDriveConfigured(),
    },
    { status: 200 }
  );
}
