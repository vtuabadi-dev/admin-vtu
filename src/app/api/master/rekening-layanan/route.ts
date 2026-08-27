import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth";

export const dynamic = "force-dynamic";

const DEFAULT_REKENING: Record<string, Array<{ namaBank: string; nomorRekening: string; atasNama: string; keterangan?: string }>> = {
  WAKAF_QURAN: [
    {
      namaBank: "Bank Syariah Indonesia (BSI)",
      nomorRekening: "721 888 9991",
      atasNama: "PT VAUZA TIGA UTAMA",
      keterangan: "Rekening Khusus Infaq & Wakaf Al-Qur'an",
    },
    {
      namaBank: "Bank Mandiri",
      nomorRekening: "142 00 9988 7766",
      atasNama: "PT VAUZA TIGA UTAMA",
      keterangan: "Rekening Operasional Wakaf Al-Qur'an",
    },
  ],
  BADAL_UMROH: [
    {
      namaBank: "Bank Mandiri (IDR)",
      nomorRekening: "142-00-1234567-8",
      atasNama: "PT VAUZA TIGA UTAMA",
      keterangan: "Rekening Khusus Badal Umroh Amanah",
    },
    {
      namaBank: "Bank Syariah Indonesia (BSI)",
      nomorRekening: "721 888 9991",
      atasNama: "PT VAUZA TIGA UTAMA",
      keterangan: "Rekening Khusus Badal Umroh BSI",
    },
  ],
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipeLayanan = searchParams.get("tipeLayanan"); // 'WAKAF_QURAN' | 'BADAL_UMROH'

    const where: any = {};
    if (tipeLayanan) {
      where.tipeLayanan = tipeLayanan;
    }

    let records = await prisma.masterRekeningLayanan.findMany({
      where,
      orderBy: [{ urutan: "asc" }, { createdAt: "asc" }],
    });

    // If database is empty for the requested type, seed default fallbacks into DB
    if (records.length === 0 && tipeLayanan && DEFAULT_REKENING[tipeLayanan]) {
      const defaults = DEFAULT_REKENING[tipeLayanan];
      const created = await Promise.all(
        defaults.map((item, idx) =>
          prisma.masterRekeningLayanan.create({
            data: {
              tipeLayanan,
              namaBank: item.namaBank,
              nomorRekening: item.nomorRekening,
              atasNama: item.atasNama,
              keterangan: item.keterangan || null,
              isActive: true,
              urutan: idx + 1,
            },
          })
        )
      );
      records = created;
    }

    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    console.error("[MASTER REKENING GET ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal mengambil data rekening layanan" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, tipeLayanan, namaBank, nomorRekening, atasNama, keterangan, isActive, urutan } = body;

    if (!tipeLayanan || !namaBank?.trim() || !nomorRekening?.trim() || !atasNama?.trim()) {
      return NextResponse.json({ success: false, message: "Data rekening tidak lengkap" }, { status: 400 });
    }

    const updatedBy = session.user.name || session.user.email || "Admin";

    let result;
    if (id) {
      result = await prisma.masterRekeningLayanan.update({
        where: { id },
        data: {
          tipeLayanan,
          namaBank: namaBank.trim(),
          nomorRekening: nomorRekening.trim(),
          atasNama: atasNama.trim(),
          keterangan: keterangan?.trim() || null,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
          urutan: Number(urutan) || 1,
          updatedBy,
        },
      });
    } else {
      result = await prisma.masterRekeningLayanan.create({
        data: {
          tipeLayanan,
          namaBank: namaBank.trim(),
          nomorRekening: nomorRekening.trim(),
          atasNama: atasNama.trim(),
          keterangan: keterangan?.trim() || null,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
          urutan: Number(urutan) || 1,
          updatedBy,
        },
      });
    }

    return NextResponse.json({ success: true, data: result, message: "Rekening berhasil disimpan" });
  } catch (error: any) {
    console.error("[MASTER REKENING POST ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal menyimpan data rekening" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "ID Rekening diperlukan" }, { status: 400 });
    }

    await prisma.masterRekeningLayanan.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Rekening berhasil dihapus" });
  } catch (error: any) {
    console.error("[MASTER REKENING DELETE ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal menghapus rekening" }, { status: 500 });
  }
}
