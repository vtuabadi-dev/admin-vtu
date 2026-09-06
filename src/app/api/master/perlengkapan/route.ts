import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/client";
import { TipePengambilanPerlengkapan, SifatPerlengkapan, GenderTarget } from "@prisma/client";

// GET /api/master/perlengkapan
// Returns all MasterPerlengkapan items along with their variants and warehouse stocks
export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await prisma.masterPerlengkapan.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        satuan: true,
        tipePengambilan: true,
        sifatPerlengkapan: true,
        genderTarget: true,
        isActive: true,
        ukuran: {
          select: {
            id: true,
            kodeUkuran: true,
            namaUkuran: true,
            kelompokUkuran: true,
          },
          orderBy: {
            kodeUkuran: "asc",
          },
        },
      },
      orderBy: {
        code: "asc",
      },
    });

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error("GET /api/master/perlengkapan error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT /api/master/perlengkapan
// Updates item criteria (name, satuan, tipePengambilan, sifatPerlengkapan, genderTarget, isActive)
// and handles variant synchronization (toggling variant on/off, updating variant list)
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      id,
      name,
      satuan,
      tipePengambilan,
      sifatPerlengkapan,
      genderTarget,
      isActive,
      hasVariants,
      variants, // Array of { id?: string, kodeUkuran: string, namaUkuran: string, kelompokUkuran?: string }
    } = body;

    if (!id || !name) {
      return NextResponse.json(
        { success: false, message: "ID dan Nama Perlengkapan wajib diisi" },
        { status: 400 }
      );
    }

    // Verify existing item
    const existing = await prisma.masterPerlengkapan.findUnique({
      where: { id },
      include: { ukuran: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Data perlengkapan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Get active warehouses for seeding initial stock if needed
    const activeGudangList = await prisma.masterGudang.findMany({
      where: { isActive: true },
    });

    // 1. Update criteria directly
    await prisma.masterPerlengkapan.update({
      where: { id },
      data: {
        name: name.trim(),
        ...(satuan ? { satuan: satuan.trim() } : {}),
        ...(tipePengambilan && Object.values(TipePengambilanPerlengkapan).includes(tipePengambilan)
          ? { tipePengambilan }
          : {}),
        ...(sifatPerlengkapan && Object.values(SifatPerlengkapan).includes(sifatPerlengkapan)
          ? { sifatPerlengkapan }
          : {}),
        ...(genderTarget && Object.values(GenderTarget).includes(genderTarget)
          ? { genderTarget }
          : {}),
        ...(typeof isActive === "boolean" ? { isActive } : {}),
      },
    });

    // 2. Handle Variants Sync
    if (hasVariants === false) {
      // Non-variant mode: delete all custom variants and ensure a single STD variant exists
      const nonStdUkuran = existing.ukuran.filter((u) => u.kodeUkuran !== "STD");
      if (nonStdUkuran.length > 0) {
        const nonStdIds = nonStdUkuran.map((u) => u.id);
        await prisma.stokGudangItem.deleteMany({
          where: { ukuranId: { in: nonStdIds } },
        });
        await prisma.masterPerlengkapanUkuran.deleteMany({
          where: { id: { in: nonStdIds } },
        });
      }

      // Ensure STD exists
      let stdUkuran = existing.ukuran.find((u) => u.kodeUkuran === "STD");
      if (!stdUkuran) {
        stdUkuran = await prisma.masterPerlengkapanUkuran.create({
          data: {
            barangId: id,
            kodeUkuran: "STD",
            namaUkuran: "Ukuran Standar",
            kelompokUkuran: "STANDAR",
          },
        });

        // Seed stock records for each warehouse in a single batch query
        if (activeGudangList.length > 0) {
          await prisma.stokGudangItem.createMany({
            data: activeGudangList.map((g) => ({
              gudangId: g.id,
              ukuranId: stdUkuran!.id,
              stokTersedia: 50,
              ambangBatasMin: 10,
            })),
            skipDuplicates: true,
          });
        }
      }
    } else if (hasVariants === true) {
      // Variant mode: delete STD variant if it exists and we have custom variants
      const incomingVariants: {
        id?: string;
        kodeUkuran: string;
        namaUkuran: string;
        kelompokUkuran?: string;
      }[] = Array.isArray(variants) ? variants : [];

      // Remove STD variant when custom variants exist
      if (incomingVariants.length > 0) {
        const stdUkuran = existing.ukuran.find((u) => u.kodeUkuran === "STD");
        if (stdUkuran) {
          await prisma.stokGudangItem.deleteMany({
            where: { ukuranId: stdUkuran.id },
          });
          await prisma.masterPerlengkapanUkuran.delete({
            where: { id: stdUkuran.id },
          });
        }
      }

      // Determine which variants to keep or delete
      const incomingCodes = new Set(incomingVariants.map((v) => v.kodeUkuran.trim().toUpperCase()));
      const toDeleteUkuran = existing.ukuran.filter(
        (u) => u.kodeUkuran !== "STD" && !incomingCodes.has(u.kodeUkuran.trim().toUpperCase())
      );

      if (toDeleteUkuran.length > 0) {
        const toDeleteIds = toDeleteUkuran.map((u) => u.id);
        await prisma.stokGudangItem.deleteMany({
          where: { ukuranId: { in: toDeleteIds } },
        });
        await prisma.masterPerlengkapanUkuran.deleteMany({
          where: { id: { in: toDeleteIds } },
        });
      }

      // Upsert incoming variants
      const savedUkuranIds: string[] = [];
      for (const v of incomingVariants) {
        const cleanCode = v.kodeUkuran.trim();
        const cleanName = v.namaUkuran.trim() || cleanCode;
        const cleanKelompok = v.kelompokUkuran || "STANDAR";

        const uk = await prisma.masterPerlengkapanUkuran.upsert({
          where: {
            barangId_kodeUkuran: {
              barangId: id,
              kodeUkuran: cleanCode,
            },
          },
          update: {
            namaUkuran: cleanName,
            kelompokUkuran: cleanKelompok,
          },
          create: {
            barangId: id,
            kodeUkuran: cleanCode,
            namaUkuran: cleanName,
            kelompokUkuran: cleanKelompok,
          },
        });
        savedUkuranIds.push(uk.id);
      }

      // Seed warehouse stock in a single batch query
      if (activeGudangList.length > 0 && savedUkuranIds.length > 0) {
        const stockData = [];
        for (const ukId of savedUkuranIds) {
          for (const gdg of activeGudangList) {
            stockData.push({
              gudangId: gdg.id,
              ukuranId: ukId,
              stokTersedia: 50,
              ambangBatasMin: 10,
            });
          }
        }
        await prisma.stokGudangItem.createMany({
          data: stockData,
          skipDuplicates: true,
        });
      }
    }

    // Fetch fresh updated item OUTSIDE the transaction for fastest transaction close
    const result = await prisma.masterPerlengkapan.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        satuan: true,
        tipePengambilan: true,
        sifatPerlengkapan: true,
        genderTarget: true,
        isActive: true,
        ukuran: {
          select: {
            id: true,
            kodeUkuran: true,
            namaUkuran: true,
            kelompokUkuran: true,
          },
          orderBy: { kodeUkuran: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("PUT /api/master/perlengkapan error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/master/perlengkapan?id=...
// Deletes a MasterPerlengkapan item along with its variants and dependent records safely
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { success: false, message: "ID perlengkapan wajib disertakan" },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.masterPerlengkapan.findUnique({
      where: { id },
      include: {
        ukuran: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Data perlengkapan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Execute safe cascading delete inside transaction
    await prisma.$transaction(
      async (tx) => {
        const ukuranIds = existing.ukuran.map((u) => u.id);
        if (ukuranIds.length > 0) {
          await tx.stokGudangItem.deleteMany({
            where: { ukuranId: { in: ukuranIds } },
          });
          await tx.masterPerlengkapanUkuran.deleteMany({
            where: { id: { in: ukuranIds } },
          });
        }

        await tx.paketPerlengkapanRule.deleteMany({
          where: { barangId: id },
        });

        await tx.perlengkapanMutasi.deleteMany({
          where: { barangId: id },
        });

        await tx.pengambilanPerlengkapanItem.deleteMany({
          where: { barangId: id },
        });

        await tx.masterPerlengkapan.delete({
          where: { id },
        });
      },
      {
        maxWait: 10000,
        timeout: 20000,
      }
    );

    return NextResponse.json({
      success: true,
      message: `Barang "${existing.name}" (${existing.code}) berhasil dihapus`,
    });
  } catch (error) {
    console.error("DELETE /api/master/perlengkapan error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}

