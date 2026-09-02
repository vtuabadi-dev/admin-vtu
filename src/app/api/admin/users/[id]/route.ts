import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/client";
import type { OperationalRole } from "@/shared/types";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ success: false, message: "Forbidden — Super Admin only" }, { status: 403 });
  }

  try {
    const { id } = params;
    const body = await request.json();
    const { name, email, role, secondaryRoles } = body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ success: false, message: "User tidak ditemukan" }, { status: 404 });
    }

    const updateData: {
      name?: string;
      email?: string;
      role?: OperationalRole;
      secondaryRoles?: string[];
    } = {};

    if (name && typeof name === "string") updateData.name = name;
    if (email && typeof email === "string") updateData.email = email.toLowerCase().trim();
    if (role && typeof role === "string") updateData.role = role as OperationalRole;
    if (Array.isArray(secondaryRoles)) {
      const targetRole = updateData.role || existingUser.role;
      updateData.secondaryRoles = secondaryRoles.filter(
        (r: string) => typeof r === "string" && r !== targetRole
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        secondaryRoles: true,
        mustChangePassword: true,
        isInvitePending: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Data & role pengelola berhasil diperbarui",
      data: updatedUser,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
