import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { pembayaranRepo } from "@/server/repositories";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  try {
    const data = await pembayaranRepo.getReviewQueue();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
