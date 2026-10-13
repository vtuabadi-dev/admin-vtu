import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/client";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    let user = null;
    if (session.user.id && !session.user.id.startsWith("mock-")) {
      user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          secondaryRoles: true,
          kantorCabang: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    if (!user && session.user.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email.toLowerCase().trim() },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          secondaryRoles: true,
          kantorCabang: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    // Fallback for mock/demo accounts
    if (!user) {
      user = {
        id: session.user.id || "mock-admin",
        name: session.user.name || "Admin VTU",
        email: session.user.email || "admin@vtu.id",
        phone: null,
        role: session.user.role || "super_admin",
        secondaryRoles: [],
        kantorCabang: "Malang",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        kantorCabang: user.kantorCabang || "Malang",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      kantorCabang,
      currentPassword,
      newPassword,
      confirmPassword,
    } = body;

    // Locate user in DB
    let existingUser = null;
    if (session.user.id && !session.user.id.startsWith("mock-")) {
      existingUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    }
    if (!existingUser && session.user.email) {
      existingUser = await prisma.user.findUnique({
        where: { email: session.user.email.toLowerCase().trim() },
      });
    }

    // If user is a mock admin in DB, create or upsert record if needed
    if (!existingUser && session.user.email) {
      const defaultHash = await bcrypt.hash("admin123", 10);
      existingUser = await prisma.user.create({
        data: {
          name: session.user.name || "Admin VTU",
          email: session.user.email.toLowerCase().trim(),
          phone: typeof phone === "string" ? phone : null,
          role: session.user.role || "super_admin",
          passwordHash: defaultHash,
          kantorCabang: kantorCabang || "Malang",
        },
      });
    }

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: "Akun pengelola tidak ditemukan di basis data" },
        { status: 404 }
      );
    }

    const updateData: {
      name?: string;
      email?: string;
      phone?: string | null;
      kantorCabang?: string;
      passwordHash?: string;
    } = {};

    if (name && typeof name === "string") updateData.name = name.trim();
    if (email && typeof email === "string") {
      const cleanEmail = email.toLowerCase().trim();
      if (cleanEmail !== existingUser.email) {
        // Check uniqueness
        const emailTaken = await prisma.user.findUnique({ where: { email: cleanEmail } });
        if (emailTaken && emailTaken.id !== existingUser.id) {
          return NextResponse.json(
            { success: false, message: "Email sudah digunakan oleh akun lain" },
            { status: 400 }
          );
        }
        updateData.email = cleanEmail;
      }
    }
    if (phone !== undefined) {
      updateData.phone = typeof phone === "string" && phone.trim() ? phone.trim() : null;
    }
    if (kantorCabang && typeof kantorCabang === "string") {
      updateData.kantorCabang = kantorCabang;
    }

    // Password change handling
    if (newPassword) {
      if (!confirmPassword) {
        return NextResponse.json(
          { success: false, message: "Konfirmasi password baru wajib diisi" },
          { status: 400 }
        );
      }
      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          { success: false, message: "Password baru dan konfirmasi tidak cocok" },
          { status: 400 }
        );
      }
      if (String(newPassword).length < 6) {
        return NextResponse.json(
          { success: false, message: "Password minimal 6 karakter" },
          { status: 400 }
        );
      }

      // Check current password
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, message: "Password saat ini wajib diisi untuk mengubah password" },
          { status: 400 }
        );
      }

      const isCurrentValid = await bcrypt.compare(currentPassword, existingUser.passwordHash);
      if (!isCurrentValid) {
        return NextResponse.json(
          { success: false, message: "Password saat ini salah / tidak cocok" },
          { status: 400 }
        );
      }

      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id: existingUser.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        secondaryRoles: true,
        kantorCabang: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Data profil dan akun admin berhasil diperbarui",
      data: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
