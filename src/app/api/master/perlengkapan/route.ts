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
      include: {
        ukuran: {
          include: {
            stokGudang: {
              include: {
                gudang: true,
              },
            },
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

    // Execute updates in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update criteria
      await tx.masterPerlengkapan.update({
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
          // Delete associated stock records first
          await tx.stokGudangItem.deleteMany({
            where: { ukuranId: { in: nonStdIds } },
          });
          // Delete non-std variants
          await tx.masterPerlengkapanUkuran.deleteMany({
            where: { id: { in: nonStdIds } },
          });
        }

        // Ensure STD exists
        let stdUkuran = existing.ukuran.find((u) => u.kodeUkuran === "STD");
        if (!stdUkuran) {
          stdUkuran = await tx.masterPerlengkapanUkuran.create({
            data: {
              barangId: id,
              kodeUkuran: "STD",
              namaUkuran: "Ukuran Standar",
              kelompokUkuran: "STANDAR",
            },
          });

          // Seed stock records for each warehouse
          if (activeGudangList.length > 0) {
            await Promise.all(
              activeGudangList.map((g) =>
                tx.stokGudangItem.upsert({
                  where: { gudangId_ukuranId: { gudangId: g.id, ukuranId: stdUkuran!.id } },
                  update: {},
                  create: {
                    gudangId: g.id,
                    ukuranId: stdUkuran!.id,
                    stokTersedia: 50,
                    ambangBatasMin: 10,
                  },
                })
              )
            );
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
            await tx.stokGudangItem.deleteMany({
              where: { ukuranId: stdUkuran.id },
            });
            await tx.masterPerlengkapanUkuran.delete({
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
          await tx.stokGudangItem.deleteMany({
            where: { ukuranId: { in: toDeleteIds } },
          });
          await tx.masterPerlengkapanUkuran.deleteMany({
            where: { id: { in: toDeleteIds } },
          });
        }

        // Upsert incoming variants
        for (const v of incomingVariants) {
          const cleanCode = v.kodeUkuran.trim();
          const cleanName = v.namaUkuran.trim() || cleanCode;
          const cleanKelompok = v.kelompokUkuran || "STANDAR";

          const uk = await tx.masterPerlengkapanUkuran.upsert({
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

          // Seed warehouse stock if not yet existing
          for (const gdg of activeGudangList) {
            const existingStok = await tx.stokGudangItem.findUnique({
              where: {
                gudangId_ukuranId: {
                  gudangId: gdg.id,
                  ukuranId: uk.id,
                },
              },
            });

            if (!existingStok) {
              await tx.stokGudangItem.create({
                data: {
                  gudangId: gdg.id,
                  ukuranId: uk.id,
                  stokTersedia: 50,
                  ambangBatasMin: 10,
                },
              });
            }
          }
        }
      }

      // Fetch fresh updated item
      return tx.masterPerlengkapan.findUnique({
        where: { id },
        include: {
          ukuran: {
            include: {
              stokGudang: {
                include: { gudang: true },
              },
            },
            orderBy: { kodeUkuran: "asc" },
          },
        },
      });
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
