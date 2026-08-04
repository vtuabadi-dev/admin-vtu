import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db";

// Public POST: Verify Applicant Name + Phone Number for Badal & Wakaf Portal Access
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { namaPemohon, nomorWhatsapp } = body;

    if (!namaPemohon || typeof namaPemohon !== "string" || !namaPemohon.trim()) {
      return NextResponse.json({
        success: false,
        message: "Mohon masukkan Nama Pendaftar yang valid.",
      }, { status: 400 });
    }

    if (!nomorWhatsapp || typeof nomorWhatsapp !== "string" || !nomorWhatsapp.trim()) {
      return NextResponse.json({
        success: false,
        message: "Mohon masukkan Nomor WhatsApp yang valid.",
      }, { status: 400 });
    }

    const cleanName = namaPemohon.trim().toLowerCase();
    const cleanWa = String(nomorWhatsapp).replace(/[^0-9]/g, "");
    const formattedWa62 = cleanWa.startsWith("0") ? `62${cleanWa.slice(1)}` : cleanWa;
    const rawWa08 = cleanWa.startsWith("62") ? `0${cleanWa.slice(2)}` : cleanWa;

    // Search Badal Umroh registrations with matching namaPemohon & WA
    const badalList = await prisma.badalUmrohRegistration.findMany({
      where: {
        namaPemohon: {
          contains: cleanName,
          mode: "insensitive",
        },
        OR: [
          { nomorWhatsapp: { contains: cleanWa } },
          { nomorWhatsapp: { contains: formattedWa62 } },
          { nomorWhatsapp: { contains: rawWa08 } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    // Search Wakaf Quran registrations with matching namaPewakaf & WA
    const wakafList = await prisma.wakafQuranRegistration.findMany({
      where: {
        namaPewakaf: {
          contains: cleanName,
          mode: "insensitive",
        },
        OR: [
          { nomorWhatsapp: { contains: cleanWa } },
          { nomorWhatsapp: { contains: formattedWa62 } },
          { nomorWhatsapp: { contains: rawWa08 } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    const totalFound = badalList.length + wakafList.length;

    // Gagal Masuk jika belum pernah ada pendaftaran
    if (totalFound === 0) {
      return NextResponse.json({
        success: false,
        message: `Kombinasi Nama Pendaftar "${namaPemohon.trim()}" dan Nomor WhatsApp "${nomorWhatsapp.trim()}" belum pernah melakukan pendaftaran Badal Umroh maupun Wakaf Qur'an. Silakan lakukan pendaftaran terlebih dahulu.`,
        totalFound: 0,
      }, { status: 404 });
    }

    // Masuk Berhasil
    return NextResponse.json({
      success: true,
      message: "Kombinasi sandi terverifikasi! Berhasil masuk ke portal riwayat pendaftaran.",
      data: {
        namaPemohon: badalList[0]?.namaPemohon || wakafList[0]?.namaPewakaf || namaPemohon.trim(),
        nomorWhatsapp: badalList[0]?.nomorWhatsapp || wakafList[0]?.nomorWhatsapp || nomorWhatsapp.trim(),
        badalList,
        wakafList,
        totalFound,
      },
    });
  } catch (error: any) {
    console.error("[TRACK LOGIN ERROR]", error);
    return NextResponse.json({
      success: false,
      message: "Terjadi kesalahan sistem saat memeriksa data pendaftaran.",
    }, { status: 500 });
  }
}
