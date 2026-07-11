import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { keberangkatanRepo } from "@/server/repositories";

import { getToken } from "next-auth/jwt";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const isSecure = request.nextUrl.protocol === "https:" || !!process.env.VERCEL_URL;
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "",
    secureCookie: isSecure,
  });

  if (!token) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const session = { user: { role: token.role, id: token.id } } as any;
  const perm = checkServerPermission(session, "keberangkatan", "view");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const data = await keberangkatanRepo.findById(params.id);
    if (!data) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const isSecure = request.nextUrl.protocol === "https:" || !!process.env.VERCEL_URL;
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "",
    secureCookie: isSecure,
  });

  if (!token) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const session = { user: { role: token.role, id: token.id } } as any;
  const perm = checkServerPermission(session, "keberangkatan", "delete");

  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    await keberangkatanRepo.delete(params.id);
    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 400 });
  }
}
