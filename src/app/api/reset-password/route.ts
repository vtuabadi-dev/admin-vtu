import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { auditRepo } from "@/server/repositories";

const PASSWORD_MIN_LENGTH = 8;

function validatePasswordComplexity(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password minimal ${PASSWORD_MIN_LENGTH} karakter`;
  }
  if (!/[A-Z]/.test(password)) {
    return "Password harus mengandung minimal 1 huruf kapital";
  }
  if (!/[a-z]/.test(password)) {
    return "Password harus mengandung minimal 1 huruf kecil";
  }
  if (!/\d/.test(password)) {
    return "Password harus mengandung minimal 1 angka";
  }
  return null; // valid
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { password, confirmPassword, currentPassword } = body as {
      password: string;
      confirmPassword: string;
      currentPassword?: string;
    };

    // Validate required fields
    if (!password || !confirmPassword) {
      return NextResponse.json({ success: false, message: "Password dan konfirmasi password wajib diisi" }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ success: false, message: "Password dan konfirmasi tidak cocok" }, { status: 400 });
    }

    // Password complexity check
    const complexityError = validatePasswordComplexity(password);
    if (complexityError) {
      return NextResponse.json({ success: false, message: complexityError }, { status: 400 });
    }

    const { prisma } = await import("@/server/db/client");
    const bcrypt = await import("bcryptjs");

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user) {
      return NextResponse.json({ success: false, message: "User tidak ditemukan" }, { status: 404 });
    }

    // Verify old password is different from new password
    const isSameAsOld = await bcrypt.compare(password, user.passwordHash);
    if (isSameAsOld) {
      return NextResponse.json({
        success: false,
        message: "Password baru harus berbeda dengan password sebelumnya",
      }, { status: 400 });
    }

    // If currentPassword is provided (optional), verify it matches
    if (currentPassword) {
      const currentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!currentPasswordValid) {
        return NextResponse.json({ success: false, message: "Password saat ini tidak sesuai" }, { status: 400 });
      }
    }

    // Hash and update
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });

    // Audit
    try {
      await auditRepo.create({
        userId: user.id,
        userName: user.name,
        role: user.role as any,
        module: "jamaah",
        action: "registration.password_changed",
        detail: `Password berhasil diubah oleh ${user.name} — status mustChangePassword dinonaktifkan`,
        entityId: user.id,
        entityType: "User",
      });
    } catch { /* Non-critical */ }

    return NextResponse.json({ success: true, data: { message: "Password berhasil diubah" } });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
