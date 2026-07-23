import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth";

// Public POST: Submit Pendaftaran Wakaf Quran from Portal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { namaPewakaf, nomorWhatsapp, emailPewakaf, jumlahMushaf, lokasiWakaf, niatAtasNama, catatan } = body;

    if (!namaPewakaf || !nomorWhatsapp) {
      return NextResponse.json({ success: false, message: "Mohon isi nama pewakaf dan nomor WA" }, { status: 400 });
    }

    const reg = await prisma.wakafQuranRegistration.create({
      data: {
        namaPewakaf: String(namaPewakaf).trim(),
        nomorWhatsapp: String(nomorWhatsapp).trim(),
        emailPewakaf: emailPewakaf ? String(emailPewakaf).trim() : null,
        jumlahMushaf: typeof jumlahMushaf === "number" ? jumlahMushaf : parseInt(jumlahMushaf, 10) || 5,
        lokasiWakaf: lokasiWakaf || "Masjidil Haram Makkah Al-Mukarramah",
        niatAtasNama: niatAtasNama ? String(niatAtasNama).trim() : null,
        catatan: catatan ? String(catatan).trim() : null,
        status: "Pending",
      },
    });

    return NextResponse.json({ success: true, data: reg, message: "Pendaftaran Wakaf Qur'an berhasil disimpan" });
  } catch (error: any) {
    console.error("[WAKAF QURAN POST ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal menyimpan pendaftaran Wakaf Qur'an" }, { status: 500 });
  }
}

// Admin GET: List all Wakaf Quran Registrations
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    const list = await prisma.wakafQuranRegistration.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: list });
  } catch (error: any) {
    console.error("[WAKAF QURAN GET ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal mengambil data Wakaf Qur'an" }, { status: 500 });
  }
}
