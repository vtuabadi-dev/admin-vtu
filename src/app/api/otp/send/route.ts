import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nomorWhatsapp } = body;

    if (!nomorWhatsapp) {
      return NextResponse.json({ success: false, message: "Nomor WhatsApp wajib diisi" }, { status: 400 });
    }

    // Clean & normalize WA number
    const cleanWa = String(nomorWhatsapp).replace(/[^0-9]/g, "");
    const formattedWa = cleanWa.startsWith("0") ? `62${cleanWa.slice(1)}` : cleanWa;

    // Generate 6-Digit OTP Code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Expire in 5 mins

    // Invalidate old OTPs for this number
    await prisma.otpVerification.deleteMany({
      where: { nomorWhatsapp: formattedWa },
    });

    // Save new OTP
    await prisma.otpVerification.create({
      data: {
        nomorWhatsapp: formattedWa,
        code,
        expiresAt,
        verified: false,
      },
    });

    // Simulated WA gateway response link / demo OTP code for verification
    const waText = encodeURIComponent(`Kode OTP VTU Anda adalah: *${code}*. Berlaku selama 5 menit. Jangan berikan kode ini kepada siapapun.`);
    const waLink = `https://wa.me/${formattedWa}?text=${waText}`;

    return NextResponse.json({
      success: true,
      message: `Kode OTP 6-digit telah dikirim ke nomor WhatsApp +${formattedWa}`,
      code, // Returned for testing / demo display
      waLink,
      expiresInSeconds: 300,
    });
  } catch (error: any) {
    console.error("[OTP SEND ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal mengirim kode OTP WA" }, { status: 500 });
  }
}
