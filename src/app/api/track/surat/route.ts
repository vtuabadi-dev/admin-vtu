import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const no = searchParams.get("no");
    const reg = searchParams.get("reg");

    let jamaahData: any = null;
    let keberangkatanData: any = null;

    if (reg) {
      jamaahData = await prisma.jamaah.findFirst({
        where: {
          OR: [
            { id: reg },
            { registrationId: reg },
            { nomorPeserta: reg },
          ],
        },
        include: {
          group: {
            include: {
              keberangkatan: true,
            },
          },
        },
      });
      if (jamaahData?.group?.keberangkatan) {
        keberangkatanData = jamaahData.group.keberangkatan;
      }
    }

    return NextResponse.json({
      success: true,
      verified: true,
      data: {
        id: id || "VERIF-DOC-VTU",
        nomorSurat: no || "SR-PASPOR/001/VTU/VIII/2026",
        publisher: "PT. Vauza Trikarsa Utama (VTU Abadi)",
        license: "PPIU Kemenag RI No. U.400 Tahun 2021",
        verifiedAt: new Date().toISOString(),
        jamaah: jamaahData
          ? {
              namaLengkap: jamaahData.namaLengkap,
              nik: jamaahData.nik ? `${jamaahData.nik.slice(0, 6)}******${jamaahData.nik.slice(-4)}` : "-",
              nomorPaspor: jamaahData.nomorPaspor || "-",
              registrationId: jamaahData.registrationId || jamaahData.nomorPeserta || jamaahData.id,
            }
          : null,
        keberangkatan: keberangkatanData
          ? {
              namaPaket: keberangkatanData.namaPaket,
              kode: keberangkatanData.kode,
              tanggalBerangkat: keberangkatanData.tanggalBerangkat,
              tanggalPulang: keberangkatanData.tanggalPulang,
              maskapai: keberangkatanData.maskapai,
            }
          : null,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
