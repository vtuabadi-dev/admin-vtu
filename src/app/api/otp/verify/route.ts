import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nomorWhatsapp, code } = body;

    if (!nomorWhatsapp || !code) {
      return NextResponse.json({ success: false, message: "Nomor WA dan Kode OTP wajib diisi" }, { status: 400 });
    }

    const cleanWa = String(nomorWhatsapp).replace(/[^0-9]/g, "");
    const formattedWa = cleanWa.startsWith("0") ? `62${cleanWa.slice(1)}` : cleanWa;
    const rawWa08 = cleanWa.startsWith("62") ? `0${cleanWa.slice(2)}` : cleanWa;

    // Find active valid OTP
    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        nomorWhatsapp: formattedWa,
        code: String(code).trim(),
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return NextResponse.json({
        success: false,
        message: "Kode OTP salah atau telah kadaluarsa. Silakan minta kode OTP baru.",
      }, { status: 400 });
    }

    // Mark OTP as verified
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    // Search matching Badal Umroh registrations (checking both 62xxx and 08xxx formats)
    const badalList = await prisma.badalUmrohRegistration.findMany({
      where: {
        OR: [
          { nomorWhatsapp: { contains: cleanWa } },
          { nomorWhatsapp: { contains: formattedWa } },
          { nomorWhatsapp: { contains: rawWa08 } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    // Search matching Wakaf Quran registrations
    const wakafList = await prisma.wakafQuranRegistration.findMany({
      where: {
        OR: [
          { nomorWhatsapp: { contains: cleanWa } },
          { nomorWhatsapp: { contains: formattedWa } },
          { nomorWhatsapp: { contains: rawWa08 } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      message: "Verifikasi OTP WA Berhasil!",
      data: {
        badalList,
        wakafList,
        totalFound: badalList.length + wakafList.length,
      },
    });
  } catch (error: any) {
    console.error("[OTP VERIFY ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal memverifikasi OTP" }, { status: 500 });
  }
}
