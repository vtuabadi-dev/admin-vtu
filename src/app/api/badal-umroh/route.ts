import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth";

// Public POST: Submit Pendaftaran Badal Umroh from Portal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { namaPemohon, nomorWhatsapp, emailPemohon, namaAlmarhum, jenisKelamin, hubungan, paketBadal, catatan } = body;

    if (!namaPemohon || !nomorWhatsapp || !namaAlmarhum) {
      return NextResponse.json({ success: false, message: "Mohon isi nama pemohon, WA, dan nama almarhum" }, { status: 400 });
    }

    const reg = await prisma.badalUmrohRegistration.create({
      data: {
        namaPemohon: String(namaPemohon).trim(),
        nomorWhatsapp: String(nomorWhatsapp).trim(),
        emailPemohon: emailPemohon ? String(emailPemohon).trim() : null,
        namaAlmarhum: String(namaAlmarhum).trim(),
        jenisKelamin: jenisKelamin || "L",
        hubungan: hubungan || "Orang Tua",
        paketBadal: paketBadal || "Standard",
        catatan: catatan ? String(catatan).trim() : null,
        status: "Pending",
      },
    });

    return NextResponse.json({ success: true, data: reg, message: "Pendaftaran Badal Umroh berhasil disimpan" });
  } catch (error: any) {
    console.error("[BADAL UMROH POST ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal menyimpan pendaftaran Badal Umroh" }, { status: 500 });
  }
}

// Admin GET: List all Badal Umroh Registrations
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

    const list = await prisma.badalUmrohRegistration.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: list });
  } catch (error: any) {
    console.error("[BADAL UMROH GET ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal mengambil data Badal Umroh" }, { status: 500 });
  }
}
