import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { jamaahRepo } from "@/server/repositories";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const groupId = searchParams.get("groupId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
  const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined;

  try {
    const result = await jamaahRepo.findAll({ groupId, status, search, limit, offset });
    return NextResponse.json({ success: true, data: result.data, total: result.total });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const jamaah = await jamaahRepo.create(body);
    return NextResponse.json({ success: true, data: jamaah }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
