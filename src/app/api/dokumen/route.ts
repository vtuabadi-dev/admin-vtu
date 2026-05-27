import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { dokumenRepo } from "@/server/repositories";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const jamaahId = searchParams.get("jamaahId");

  try {
    if (jamaahId) {
      const data = await dokumenRepo.findByJamaah(jamaahId);
      return NextResponse.json({ success: true, data });
    }
    const data = await dokumenRepo.getReviewQueue();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
