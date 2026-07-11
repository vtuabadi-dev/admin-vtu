import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { keberangkatanRepo } from "@/server/repositories";

import { getToken } from "next-auth/jwt";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") ?? undefined;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
  const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined;

  try {
    const result = await keberangkatanRepo.findAll({ status, limit, offset });
    return NextResponse.json({ success: true, data: result.data, total: result.total });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const isSecure = request.nextUrl.protocol === "https:" || !!process.env.VERCEL_URL;
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "",
    secureCookie: isSecure,
  });

  if (!token) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const session = { user: { role: token.role, id: token.id } } as any;
  const perm = checkServerPermission(session, "keberangkatan", "create");

  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const body = await request.json();
    const result = await keberangkatanRepo.create(body);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 400 });
  }
}
