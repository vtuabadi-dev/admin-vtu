import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth";
import { sendNotification } from "@/server/services/notify";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "Pengguna tidak ditemukan" }, { status: 404 });
    }

    if (!user.isInvitePending && !user.mustChangePassword) {
      return NextResponse.json(
        { success: false, message: "Akun ini sudah aktif dan telah mengatur password." },
        { status: 400 }
      );
    }

    // Generate new secure 64-char hex invite token
    const inviteToken = crypto.randomBytes(32).toString("hex");
    const inviteExpires = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        inviteToken,
        inviteExpires,
        isInvitePending: true,
        mustChangePassword: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        inviteToken: true,
        inviteExpires: true,
        isInvitePending: true,
      },
    });

    // Determine host origin for invite URL (Prefer production domain to prevent Vercel Preview SSO redirect)
    let origin = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";
    if (!origin || origin.includes("localhost")) {
      origin = request.headers.get("origin") || request.nextUrl.origin || "https://vtu-admin-830zrfv1l-vtuabadi.vercel.app";
    }
    origin = origin.replace(/\/$/, "");

    const inviteUrl = `${origin}/setup-password?token=${inviteToken}`;

    // Dispatch invitation email via notification service
    try {
      await sendNotification({
        channel: "email",
        recipient: user.email,
        subject: "Undangan Pengelola Sistem VTU (Kirim Ulang) — Atur Password Akun Anda",
        body: `Assalamu'alaikum Wr. Wb. ${user.name},

Berikut adalah tautan undangan terbaru bagi Anda sebagai pengelola sistem VTU (${user.role}).

Silakan klik tautan di bawah ini untuk mengatur password akun masuk Anda:
${inviteUrl}

Tautan baru ini berlaku selama 72 jam ke depan.

Terima kasih,
PT VAUZA TAMMA ABADI
Sistem Operasional Travel`,
      });
    } catch (emailErr) {
      console.warn("[RESEND INVITE EMAIL WARNING]", emailErr);
    }

    return NextResponse.json({
      success: true,
      message: `Link undangan berhasil dikirim ulang ke ${user.email}`,
      inviteUrl,
      data: updatedUser,
    });
  } catch (error) {
    console.error("[RESEND INVITE ERROR]", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
