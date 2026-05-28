import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { jamaahRepo } from "@/server/repositories";

// GET /api/jamaah/me/documents — current jamaah's documents
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const jamaah = await jamaahRepo.findByUserId(session.user.id);
  if (!jamaah) {
    return NextResponse.json({ success: false, message: "Jamaah profile not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: jamaah.dokumen ?? [] });
}
