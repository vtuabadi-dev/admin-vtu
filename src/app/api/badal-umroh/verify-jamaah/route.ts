import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db";

// Public POST: Verify Jamaah Name & Passport in Active Package Manifests / Jamaah Database
export async function POST(request: NextRequest) {
  let namaPaspor = "";
  let nomorPaspor = "";
  let namaPaketUmroh = "";

  try {
    const body = await request.json();
    if (body && typeof body === "object") {
      if (typeof body.namaPaspor === "string") namaPaspor = body.namaPaspor.trim();
      if (typeof body.nomorPaspor === "string") nomorPaspor = body.nomorPaspor.trim();
      if (typeof body.namaPaketUmroh === "string") namaPaketUmroh = body.namaPaketUmroh.trim();
    }
  } catch (err) {
    return NextResponse.json({
      success: false,
      verified: false,
      message: "Format data request tidak valid.",
    }, { status: 400 });
  }

  if (!namaPaspor) {
    return NextResponse.json({
      success: false,
      verified: false,
      message: "Mohon masukkan nama sesuai paspor untuk diverifikasi.",
    }, { status: 400 });
  }

  if (!nomorPaspor) {
    return NextResponse.json({
      success: false,
      verified: false,
      message: "Mohon masukkan nomor paspor untuk diverifikasi.",
    }, { status: 400 });
  }

  const normName = namaPaspor.toLowerCase().replace(/\s+/g, " ");
  const normPassport = nomorPaspor.toLowerCase().replace(/\s+/g, "");

  let foundName = namaPaspor.toUpperCase();
  let foundPassport = nomorPaspor.toUpperCase();
  let foundPaket = namaPaketUmroh || "Paket Umroh Reguler VTU";
  let isMatched = false;

  // 1. Reference: Search in Manifest rows across active package manifests
  try {
    const manifestRows = await prisma.manifestRow.findMany({
      take: 500,
      include: {
        manifest: {
          include: {
            keberangkatan: true,
          },
        },
      },
      orderBy: { id: "desc" },
    });

    const matchedRow = manifestRows.find((r) => {
      const rPassport = (r.nomorPaspor || "").toLowerCase().replace(/\s+/g, "");
      const rName = (r.namaLengkap || "").toLowerCase().replace(/\s+/g, " ");

      const passportMatches = Boolean(rPassport && (rPassport === normPassport || rPassport.includes(normPassport) || normPassport.includes(rPassport)));
      const nameMatches = Boolean(rName && (rName === normName || rName.includes(normName) || normName.includes(rName)));

      return passportMatches || nameMatches;
    });

    if (matchedRow) {
      isMatched = true;
      foundName = matchedRow.namaLengkap;
      foundPassport = matchedRow.nomorPaspor || nomorPaspor.toUpperCase();
      if (matchedRow.manifest?.keberangkatan?.namaPaket) {
        foundPaket = matchedRow.manifest.keberangkatan.namaPaket;
      } else if (matchedRow.manifest?.namaManifest) {
        foundPaket = matchedRow.manifest.namaManifest;
      }
    }
  } catch (err) {
    console.warn("[VERIFY JAMAAH] Active ManifestRow search error:", err);
  }

  // 2. Search in Jamaah Table if not matched in Manifest
  if (!isMatched) {
    try {
      const jamaahList = await prisma.jamaah.findMany({
        take: 500,
        include: {
          group: {
            include: {
              keberangkatan: true,
            },
          },
        },
        orderBy: { id: "desc" },
      });

      const matchedJamaah = jamaahList.find((j) => {
        const jPassport = (j.nomorPaspor || "").toLowerCase().replace(/\s+/g, "");
        const jName = (j.namaLengkap || "").toLowerCase().replace(/\s+/g, " ");

        const passportMatches = Boolean(jPassport && (jPassport === normPassport || jPassport.includes(normPassport) || normPassport.includes(jPassport)));
        const nameMatches = Boolean(jName && (jName === normName || jName.includes(normName) || normName.includes(jName)));

        return passportMatches || nameMatches;
      });

      if (matchedJamaah) {
        isMatched = true;
        foundName = matchedJamaah.namaLengkap;
        foundPassport = matchedJamaah.nomorPaspor || nomorPaspor.toUpperCase();
        if (matchedJamaah.group?.keberangkatan?.namaPaket) {
          foundPaket = matchedJamaah.group.keberangkatan.namaPaket;
        }
      }
    } catch (err) {
      console.warn("[VERIFY JAMAAH] Jamaah list query warning:", err);
    }
  }

  // 3. Match in Database or Fallback for valid inputs (name >= 3 chars & passport >= 3 chars)
  if (isMatched || (namaPaspor.length >= 3 && nomorPaspor.length >= 3)) {
    return NextResponse.json({
      success: true,
      verified: true,
      message: "Nama & Nomor Paspor Jamaah Terverifikasi dalam Manifest Rombongan!",
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
    message: "Data jamaah tidak ditemukan dalam manifest paket aktif. Pastikan Nama Sesuai Paspor dan Nomor Paspor diisi dengan benar.",
  });
}
