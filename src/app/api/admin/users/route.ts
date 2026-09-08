import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { OperationalRole } from "@/shared/types";
import { sendNotification } from "@/server/services/notify";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ success: false, message: "Forbidden — Super Admin only" }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        secondaryRoles: true,
        mustChangePassword: true,
        isInvitePending: true,
        inviteToken: true,
        inviteExpires: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ success: false, message: "Forbidden — Super Admin only" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, email, phone, role, secondaryRoles } = body;

    if (!name || !email || !role) {
      return NextResponse.json({ success: false, message: "Nama lengkap, email, dan role wajib diisi" }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const cleanPhone = phone && typeof phone === "string" && phone.trim() ? phone.trim() : null;

    // Check duplicate email
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ success: false, message: "Email sudah terdaftar" }, { status: 400 });
    }

    // Process secondaryRoles array
    const validSecondaryRoles = Array.isArray(secondaryRoles)
      ? secondaryRoles.filter((r: string) => typeof r === "string" && r !== role)
      : [];

    // Generate secure 64-char hex token for invitation
    const inviteToken = crypto.randomBytes(32).toString("hex");
    // Token valid for 72 hours (3 days)
    const inviteExpires = new Date(Date.now() + 72 * 60 * 60 * 1000);

    // Random dummy hash for password until user sets their own password
    const dummyPassword = crypto.randomBytes(16).toString("hex");
    const passwordHash = await bcrypt.hash(dummyPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        phone: cleanPhone,
        passwordHash,
        role: role as OperationalRole,
        secondaryRoles: validSecondaryRoles,
        mustChangePassword: true,
        inviteToken,
        inviteExpires,
        isInvitePending: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        secondaryRoles: true,
        mustChangePassword: true,
        isInvitePending: true,
        inviteToken: true,
        inviteExpires: true,
        createdAt: true,
      },
    });

    // Determine host origin (prefer canonical production domain)
    let origin = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";
    if (!origin || origin.includes("localhost") || origin.includes("127.0.0.1")) {
      const proto = request.headers.get("x-forwarded-proto") || (request.url.startsWith("https") ? "https" : "http");
      const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
      origin = `${proto}://${host}`;
    }
    if (origin.includes("vercel.app") && !origin.includes("admin-vtuabadi.vercel.app")) {
      origin = "https://admin-vtuabadi.vercel.app";
    }
    origin = origin.replace(/\/$/, "");

    const inviteUrl = `${origin}/setup-password?token=${inviteToken}`;

    // Dispatch invitation email via notification service
    let emailStatus = { success: false, detail: "mock" };
    try {
      const notifRes = await sendNotification({
        channel: "email",
        recipient: normalizedEmail,
        subject: "Undangan Pengelola Sistem VTU — Atur Password Akun Anda",
        body: `Assalamu'alaikum Wr. Wb. ${name},

Anda telah diundang oleh Super Admin sebagai pengelola sistem VTU (${role}).

Silakan klik tautan di bawah ini untuk mengatur password akun masuk Anda:
${inviteUrl}

Tautan ini berlaku selama 72 jam. Jika Anda tidak merasa meminta akun ini, abaikan pesan ini.

Terima kasih,
PT VAUZA TAMMA ABADI
Sistem Operasional Travel`,
      });
      emailStatus = { success: notifRes.success, detail: notifRes.messageId || "sent" };
    } catch (emailErr: any) {
      emailStatus = { success: false, detail: emailErr?.message || "failed" };
      console.warn("[INVITE EMAIL FAILED]", emailErr);
    }

    return NextResponse.json(
      {
        success: true,
        data: newUser,
        inviteUrl,
        emailStatus,
        message: "Admin baru berhasil dibuat dan tautan undangan siap dibagikan",
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 400 });
  }
}
