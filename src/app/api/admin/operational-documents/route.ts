import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { operationalDocumentRepo } from "@/server/repositories/operational-document.repository";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "sistem", "view");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  const docs = await operationalDocumentRepo.findAll({ type, status });
  return NextResponse.json({ success: true, data: docs });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "sistem", "create");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  const body = await request.json();
  if (!body.type || !body.title || !body.version || body.content === undefined) {
    return NextResponse.json({ success: false, message: "type, title, version, dan content wajib diisi" }, { status: 400 });
  }

  const doc = await operationalDocumentRepo.create({
    type: body.type,
    title: body.title,
    version: body.version,
    content: body.content,
    status: body.status ?? "DRAFT",
    effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
    createdBy: session.user.id ?? undefined,
  });

  return NextResponse.json({ success: true, data: doc }, { status: 201 });
}
