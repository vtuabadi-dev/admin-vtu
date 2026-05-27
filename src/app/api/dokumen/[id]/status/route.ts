import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { dokumenRepo } from "@/server/repositories";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  try {
    const { status, verifiedBy } = await request.json();
    if (!status) return NextResponse.json({ success: false, message: "status is required" }, { status: 400 });
    const data = await dokumenRepo.updateStatus(params.id, status, verifiedBy ?? session.user.name ?? undefined);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
