import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { jamaahRepo, invoiceRepo } from "@/server/repositories";

// GET /api/jamaah/me/invoices — current jamaah's invoices
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const jamaah = await jamaahRepo.findByUserId(session.user.id);
  if (!jamaah) {
    return NextResponse.json({ success: false, message: "Jamaah profile not found" }, { status: 404 });
  }

  const invoices = await invoiceRepo.findByGroup(jamaah.groupId);
  return NextResponse.json({ success: true, data: invoices });
}
