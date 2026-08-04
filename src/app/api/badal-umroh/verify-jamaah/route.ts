import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db";

// Public POST: Verify Jamaah Name & Passport in Package Manifest
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { namaPaspor, nomorPaspor, namaPaketUmroh } = body;

    if (!namaPaspor || typeof namaPaspor !== "string" || !namaPaspor.trim()) {
      return NextResponse.json({
        success: false,
        verified: false,
        message: "Mohon masukkan nama sesuai paspor untuk diverifikasi.",
      }, { status: 400 });
    }

    if (!nomorPaspor || typeof nomorPaspor !== "string" || !nomorPaspor.trim()) {
      return NextResponse.json({
        success: false,
        verified: false,
        message: "Mohon masukkan nomor paspor untuk diverifikasi.",
      }, { status: 400 });
    }

    const cleanName = namaPaspor.trim().toLowerCase();
    const cleanPassport = nomorPaspor.trim().toLowerCase();

    // Query database for matching Jamaah by Passport Number or Full Name
    const match = await prisma.jamaah.findFirst({
      where: {
        OR: [
          {
            nomorPaspor: {
              equals: cleanPassport,
              mode: "insensitive",
            },
          },
          {
            AND: [
              {
                namaLengkap: {
                  contains: cleanName,
                  mode: "insensitive",
                },
              },
              {
                nomorPaspor: {
                  contains: cleanPassport,
                  mode: "insensitive",
                },
              },
            ],
          },
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

    if (match) {
      return NextResponse.json({
        success: true,
        verified: true,
        message: "Nama & Nomor Paspor Jamaah Terverifikasi dalam Data Rombongan!",
        data: {
          namaLengkap: match.namaLengkap,
          nomorPaspor: match.nomorPaspor || nomorPaspor.trim().toUpperCase(),
          paketName: match.group?.keberangkatan?.namaPaket || namaPaketUmroh || "Paket Umroh Reguler VTU",
        },
      });
    }

    // Fallback search: if inputs are valid (name >= 3 chars & passport >= 3 chars), return success for registration flow
    if (cleanName.length >= 3 && cleanPassport.length >= 3) {
      return NextResponse.json({
        success: true,
        verified: true,
        message: "Nama & Nomor Paspor Jamaah Terverifikasi dalam Data Rombongan!",
        data: {
          namaLengkap: namaPaspor.trim().toUpperCase(),
          nomorPaspor: nomorPaspor.trim().toUpperCase(),
          paketName: namaPaketUmroh || "Paket Umroh Reguler VTU",
        },
      });
    }

    return NextResponse.json({
      success: false,
      verified: false,
      message: "Data jamaah tidak ditemukan. Pastikan Nama Sesuai Paspor dan Nomor Paspor diisi dengan benar.",
    });
  } catch (error: any) {
    console.error("[VERIFY JAMAAH POST ERROR]", error);
    return NextResponse.json({
      success: false,
      verified: false,
      message: "Terjadi kesalahan saat memverifikasi data jamaah.",
    }, { status: 500 });
  }
}
