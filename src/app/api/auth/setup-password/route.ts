import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db/client";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ success: false, message: "Token undangan tidak ditemukan" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        inviteExpires: true,
        isInvitePending: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "Tautan undangan tidak valid atau sudah tidak tersedia" }, { status: 404 });
    }

    if (user.inviteExpires && user.inviteExpires < new Date()) {
      return NextResponse.json(
        { success: false, message: "Tautan undangan telah kadaluarsa (lebih dari 72 jam). Silakan minta Super Admin mengirimkan undangan baru." },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || "Gagal memverifikasi token undangan" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json({ success: false, message: "Token dan password baru wajib diisi" }, { status: 400 });
    }

    if (String(password).length < 6) {
      return NextResponse.json({ success: false, message: "Password minimal 6 karakter" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "Tautan undangan tidak ditemukan atau sudah digunakan" }, { status: 404 });
    }

    if (user.inviteExpires && user.inviteExpires < new Date()) {
      return NextResponse.json(
        { success: false, message: "Tautan undangan telah kadaluarsa. Minta Super Admin untuk mengundang ulang akun Anda." },
        { status: 410 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        inviteToken: null,
        inviteExpires: null,
        isInvitePending: false,
        mustChangePassword: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password akun pengelola berhasil dibuat! Silakan masuk ke dalam sistem.",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || "Gagal menyimpan password baru" }, { status: 500 });
  }
}
