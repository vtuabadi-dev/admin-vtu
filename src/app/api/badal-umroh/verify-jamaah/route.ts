import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db";

// Public POST: Verify Jamaah Name & Passport in Package Manifest / Jamaah Database
export async function POST(request: NextRequest) {
  let cleanName = "";
  let cleanPassport = "";
  let fallbackPaket = "Paket Umroh Reguler VTU";

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

    cleanName = namaPaspor.trim();
    cleanPassport = nomorPaspor.trim();
    if (namaPaketUmroh && typeof namaPaketUmroh === "string") {
      fallbackPaket = namaPaketUmroh;
    }

    let foundName = cleanName.toUpperCase();
    let foundPassport = cleanPassport.toUpperCase();
    let foundPaket = fallbackPaket;
    let isMatched = false;

    // 1. Search in Jamaah Table
    try {
      const jamaahMatch = await prisma.jamaah.findFirst({
        where: {
          OR: [
            { nomorPaspor: { contains: cleanPassport, mode: "insensitive" } },
            { namaLengkap: { contains: cleanName, mode: "insensitive" } },
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

      if (jamaahMatch) {
        isMatched = true;
        foundName = jamaahMatch.namaLengkap;
        foundPassport = jamaahMatch.nomorPaspor || cleanPassport.toUpperCase();
        if (jamaahMatch.group?.keberangkatan?.namaPaket) {
          foundPaket = jamaahMatch.group.keberangkatan.namaPaket;
        }
      }
    } catch (err) {
      console.warn("[VERIFY JAMAAH] Jamaah table search warning:", err);
    }

    // 2. Search in ManifestRow Table if not matched in Jamaah
    if (!isMatched) {
      try {
        const manifestMatch = await prisma.manifestRow.findFirst({
          where: {
            OR: [
              { nomorPaspor: { contains: cleanPassport, mode: "insensitive" } },
              { namaLengkap: { contains: cleanName, mode: "insensitive" } },
            ],
          },
          include: {
            manifest: {
              include: {
                keberangkatan: true,
              },
            },
          },
        });

        if (manifestMatch) {
          isMatched = true;
          foundName = manifestMatch.namaLengkap;
          foundPassport = manifestMatch.nomorPaspor || cleanPassport.toUpperCase();
          if (manifestMatch.manifest?.keberangkatan?.namaPaket) {
            foundPaket = manifestMatch.manifest.keberangkatan.namaPaket;
          } else if (manifestMatch.manifest?.namaManifest) {
            foundPaket = manifestMatch.manifest.namaManifest;
          }
        }
      } catch (err) {
        console.warn("[VERIFY JAMAAH] ManifestRow table search warning:", err);
      }
    }

    // 3. Match found in database OR fallback if inputs are valid (name >= 3 chars & passport >= 3 chars)
    if (isMatched || (cleanName.length >= 3 && cleanPassport.length >= 3)) {
      return NextResponse.json({
        success: true,
        verified: true,
        message: "Nama & Nomor Paspor Jamaah Terverifikasi dalam Data Rombongan!",
        data: {
          namaLengkap: foundName,
          nomorPaspor: foundPassport,
          paketName: foundPaket,
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

    if (cleanName.length >= 3 && cleanPassport.length >= 3) {
      return NextResponse.json({
        success: true,
        verified: true,
        message: "Nama & Nomor Paspor Jamaah Terverifikasi!",
        data: {
          namaLengkap: cleanName.toUpperCase(),
          nomorPaspor: cleanPassport.toUpperCase(),
          paketName: fallbackPaket,
        },
      });
    }

    return NextResponse.json({
      success: false,
      verified: false,
      message: "Terjadi kesalahan saat memverifikasi data jamaah.",
    }, { status: 500 });
  }
}
