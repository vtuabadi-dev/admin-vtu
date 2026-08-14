import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { prisma } from "@/server/db";

// PUT: Edit petugas (termasuk isActive)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  
  const perm = checkServerPermission(session, "sistem", "edit");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const body = await request.json();
    
    // We only expect updates for nama, noHp, isActive, kode
    const data = await prisma.masterPetugas.update({
      where: { id: params.id },
      data: {
        ...(body.nama ? { nama: body.nama } : {}),
        ...(body.noHp !== undefined ? { noHp: body.noHp } : {}),
        ...(body.kode !== undefined ? { kode: body.kode } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE: Soft/Hard delete petugas
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  
  const perm = checkServerPermission(session, "sistem", "delete");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    // Hard delete
    await prisma.masterPetugas.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: "Petugas deleted" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
