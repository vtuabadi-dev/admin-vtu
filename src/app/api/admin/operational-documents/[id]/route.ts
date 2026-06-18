import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { operationalDocumentRepo } from "@/server/repositories/operational-document.repository";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "sistem", "view");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  const doc = await operationalDocumentRepo.findById(params.id);
  if (!doc) return NextResponse.json({ success: false, message: "Dokumen tidak ditemukan" }, { status: 404 });

  return NextResponse.json({ success: true, data: doc });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "sistem", "edit");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  const body = await request.json();
  const doc = await operationalDocumentRepo.update(params.id, {
    title: body.title,
    content: body.content,
    status: body.status,
    effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
    updatedBy: session.user.id ?? undefined,
  });

  return NextResponse.json({ success: true, data: doc });
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "sistem", "edit");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  const doc = await operationalDocumentRepo.activateVersion(params.id, session.user.id ?? undefined);
  return NextResponse.json({ success: true, data: doc });
}
