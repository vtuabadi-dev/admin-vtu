import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { notificationRepo } from "@/server/repositories";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  try {
    const remaining = await notificationRepo.markAllAsRead(session.user.id);
    return NextResponse.json({ success: true, remainingUnread: remaining });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
