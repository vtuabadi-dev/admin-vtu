import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { notificationRepo } from "@/server/repositories";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;

  try {
    const result = await notificationRepo.findByUser(session.user.id, { unreadOnly, limit });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = await notificationRepo.create({
      userId: body.userId ?? session.user.id,
      type: body.type,
      category: body.category,
      title: body.title,
      message: body.message,
      link: body.link,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
