import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, buktiBayarUrl } = body;

    if (!id || !buktiBayarUrl) {
      return NextResponse.json({ success: false, message: "ID pendaftaran dan URL Bukti Bayar wajib diisi" }, { status: 400 });
    }

    const updated = await prisma.badalUmrohRegistration.update({
      where: { id },
      data: {
        buktiBayarUrl: String(buktiBayarUrl).trim(),
        paymentStatus: "Menunggu Konfirmasi",
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Bukti pembayaran berhasil diunggah. Menunggu konfirmasi admin.",
    });
  } catch (error: any) {
    console.error("[BADAL UPLOAD BUKTI ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal mengunggah bukti pembayaran" }, { status: 500 });
  }
}
