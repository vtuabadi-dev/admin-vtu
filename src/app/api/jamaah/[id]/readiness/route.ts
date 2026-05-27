import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { jamaahRepo } from "@/server/repositories";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  try {
    const readiness = await jamaahRepo.getReadiness(params.id);
    return NextResponse.json({ success: true, data: readiness });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
