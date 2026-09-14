import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/client";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const paketId = searchParams.get("paketId") || undefined;
  const statusFilter = searchParams.get("status") || undefined;
  const search = searchParams.get("search") || undefined;

  try {
    // Packages for dropdown filter
    const packages = await prisma.keberangkatan.findMany({
      select: {
        id: true,
        namaPaket: true,
        kodeIndividu: true,
        tanggalBerangkat: true,
        status: true,
      },
      orderBy: { tanggalBerangkat: "desc" },
    });

    // Active warehouse list
    const gudangList = await prisma.masterGudang.findMany({
      where: { isActive: true },
      orderBy: { kodeGudang: "asc" },
    });

    // Master items for checklist with variants & stock per warehouse
    const masterItems = await prisma.masterPerlengkapan.findMany({
      where: { isActive: true },
      include: {
        ukuran: {
          include: {
            stokGudang: {
              include: {
                gudang: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const where: any = {
      status: { not: "batal" },
    };

    if (paketId && paketId !== "all") {
      where.group = {
        paketKeberangkatanId: paketId,
      };
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { namaLengkap: { contains: q, mode: "insensitive" } },
        { registrationId: { contains: q, mode: "insensitive" } },
        { nomorPaspor: { contains: q, mode: "insensitive" } },
        { nik: { contains: q, mode: "insensitive" } },
      ];
    }

    const jamaahList = await prisma.jamaah.findMany({
      where,
      include: {
        group: {
          include: {
            keberangkatan: true,
            invoices: {
              include: {
                items: true,
              },
            },
          },
        },
        detailPengambilan: {
          include: {
            barang: true,
          },
        },
      },
      orderBy: [
        { registrationId: "asc" },
        { createdAt: "asc" },
      ],
    });

    // Calculate status counts
    let countTanpa = 0;
    let countBelumAmbil = 0;
    let countSebagian = 0;
    let countSudahAmbil = 0;

    const formattedJamaah = jamaahList.map((j: any) => {
      const isGroupTanpa = j.group?.tanpaPerlengkapan || j.group?.perlengkapan === "EXCLUDE" || j.tanpaPerlengkapan;
      
      // Check if jamaah or group purchased equipment add-on in invoice
      const hasAddon = (j.group?.invoices || []).some((inv: any) =>
        inv.status !== "cancelled" &&
        (!inv.jamaahId || inv.jamaahId === j.id) &&
        (inv.items || []).some((it: any) =>
          it.status !== "cancelled" &&
          `${it.kategori || ""} ${it.deskripsi || ""}`.toLowerCase().includes("perlengkapan")
        )
      );

      let effectiveStatus = j.statusPerlengkapan;

      // If package/group is without equipment, but customer ordered equipment add-on:
      if (isGroupTanpa) {
        if (hasAddon) {
          if (!effectiveStatus || effectiveStatus === "TANPA" || effectiveStatus === "BELUM_AMBIL") {
            effectiveStatus = "BELUM_AMBIL";
          }
        } else {
          effectiveStatus = "TANPA";
        }
      } else {
        if (!effectiveStatus || effectiveStatus === "BELUM_AMBIL") {
          effectiveStatus = "BELUM_AMBIL";
        }
      }

      if (effectiveStatus === "TANPA") countTanpa++;
      else if (effectiveStatus === "SUDAH_AMBIL") countSudahAmbil++;
      else if (effectiveStatus === "SEBAGIAN") countSebagian++;
      else countBelumAmbil++;

      return {
        id: j.id,
        registrationId: j.registrationId,
        nomorPeserta: j.nomorPeserta,
        namaLengkap: j.namaLengkap,
        jenisKelamin: j.jenisKelamin, // "L" | "P" | "LAKI_LAKI" | "PEREMPUAN"
        nomorTelepon: j.nomorTelepon,
        nomorPaspor: j.nomorPaspor,
        statusPerlengkapan: effectiveStatus,
        tanggalAmbilPerlengkapan: j.tanggalAmbilPerlengkapan,
        catatanPerlengkapan: j.catatanPerlengkapan,
        groupName: j.group?.namaGroup || "-",
        groupCode: j.group?.kodeRegistrasi || "-",
        paketId: j.group?.paketKeberangkatanId,
        namaPaket: j.group?.keberangkatan?.namaPaket || "-",
        tanggalKeberangkatan: j.group?.keberangkatan?.tanggalBerangkat,
        checklist: (j.detailPengambilan || []).map((dp: any) => {
          let kodeUkuran = "";
          let petugasClean = dp.petugas || "";
          if (dp.petugas && dp.petugas.includes("#UK:")) {
            const parts = dp.petugas.split("#UK:");
            petugasClean = parts[0];
            kodeUkuran = parts[1];
          }
          return {
            barangId: dp.barangId,
            namaBarang: dp.barang?.name,
            code: dp.barang?.code,
            status: dp.status,
            tanggalAmbil: dp.tanggalAmbil,
            petugas: petugasClean,
            kodeUkuran: kodeUkuran || undefined,
          };
        }),
      };
    });

    // Filter by status if requested
    const filteredData = statusFilter && statusFilter !== "ALL"
      ? formattedJamaah.filter((j: any) => j.statusPerlengkapan === statusFilter)
      : formattedJamaah;

    return NextResponse.json({
      success: true,
      data: {
        packages,
        gudangList,
        masterItems,
        jamaah: filteredData,
        stats: {
          total: formattedJamaah.length,
          tanpa: countTanpa,
          belumAmbil: countBelumAmbil,
          sebagian: countSebagian,
          sudahAmbil: countSudahAmbil,
        },
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { jamaahId, gudangId, statusPerlengkapan, tanggalAmbilPerlengkapan, catatanPerlengkapan, items } = body;

    if (!jamaahId) {
      return NextResponse.json({ success: false, message: "Jamaah ID wajib diisi" }, { status: 400 });
    }

    let finalStatus = statusPerlengkapan;
    const now = new Date();
    const petugasName = (session.user as any)?.name || "Admin";

    // If items checklist is provided
    if (Array.isArray(items) && items.length > 0) {
      for (const it of items) {
        const existing = await prisma.pengambilanPerlengkapanItem.findUnique({
          where: {
            jamaahId_barangId: {
              jamaahId,
              barangId: it.barangId,
            },
          },
        });

        const isNewlyTaken = it.status === "SUDAH" && (!existing || existing.status !== "SUDAH");

        const petugasWithUkuran = it.kodeUkuran ? `${petugasName}#UK:${it.kodeUkuran}` : petugasName;

        await prisma.pengambilanPerlengkapanItem.upsert({
          where: {
            jamaahId_barangId: {
              jamaahId,
              barangId: it.barangId,
            },
          },
          update: {
            status: it.status,
            tanggalAmbil: it.status === "SUDAH" ? (tanggalAmbilPerlengkapan ? new Date(tanggalAmbilPerlengkapan) : now) : null,
            petugas: petugasWithUkuran,
          },
          create: {
            jamaahId,
            barangId: it.barangId,
            status: it.status,
            tanggalAmbil: it.status === "SUDAH" ? (tanggalAmbilPerlengkapan ? new Date(tanggalAmbilPerlengkapan) : now) : null,
            petugas: petugasWithUkuran,
          },
        });

        // Deduct warehouse specific stock if newly checked as taken
        if (isNewlyTaken) {
          const barang = await prisma.masterPerlengkapan.findUnique({
            where: { id: it.barangId },
            include: { ukuran: true },
          });

          if (barang) {
            const targetUkuran = it.kodeUkuran
              ? barang.ukuran.find((u) => u.kodeUkuran === it.kodeUkuran) || barang.ukuran[0]
              : barang.ukuran[0];

            const gudangObj = gudangId
              ? await prisma.masterGudang.findUnique({ where: { id: gudangId } })
              : await prisma.masterGudang.findFirst({ where: { isActive: true } });

            if (targetUkuran && gudangObj) {
              await prisma.stokGudangItem.updateMany({
                where: {
                  gudangId: gudangObj.id,
                  ukuranId: targetUkuran.id,
                  stokTersedia: { gt: 0 },
                },
                data: {
                  stokTersedia: { decrement: 1 },
                },
              });

              await prisma.perlengkapanMutasi.create({
                data: {
                  barangId: it.barangId,
                  gudangId: gudangObj.id,
                  tipe: "KELUAR",
                  jumlah: 1,
                  keterangan: `Pengambilan perlengkapan jamaah di ${gudangObj.namaGudang}`,
                  petugas: petugasName,
                },
              });

              await prisma.masterPerlengkapan.update({
                where: { id: it.barangId },
                data: { stokTersedia: { decrement: 1 } },
              });
            }
          }
        }
      }

      // Auto-calculate status if not TANPA
      if (finalStatus !== "TANPA") {
        const sudahCount = items.filter((it: any) => it.status === "SUDAH").length;
        if (sudahCount === items.length) {
          finalStatus = "SUDAH_AMBIL";
        } else if (sudahCount > 0) {
          finalStatus = "SEBAGIAN";
        } else {
          finalStatus = "BELUM_AMBIL";
        }
      }
    }

    const updatedJamaah = await prisma.jamaah.update({
      where: { id: jamaahId },
      data: {
        statusPerlengkapan: finalStatus,
        tanggalAmbilPerlengkapan:
          finalStatus === "SUDAH_AMBIL" || finalStatus === "SEBAGIAN"
            ? (tanggalAmbilPerlengkapan ? new Date(tanggalAmbilPerlengkapan) : now)
            : null,
        catatanPerlengkapan: catatanPerlengkapan !== undefined ? catatanPerlengkapan : undefined,
      },
    });

    // Otomatisasi Tagihan Ongkos Jahit Seragam Jadi (Rp 100.000 / pax):
    // Jika pengambilan seragam memakai seragam jadi (bukan KAIN), otomatis tambahkan tagihan 100.000.
    // Jika diubah ke KAIN / belum diambil, batalkan/revert tagihan 100.000.
    try {
      const fullJamaah = await prisma.jamaah.findUnique({
        where: { id: jamaahId },
        include: {
          group: {
            include: {
              invoices: {
                where: { status: { not: "cancelled" } },
                include: { items: true },
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
      });

      if (fullJamaah?.group && Array.isArray(items)) {
        const seragamMasters = await prisma.masterPerlengkapan.findMany({
          where: {
            OR: [
              { code: { startsWith: "SRG" } },
              { name: { contains: "seragam", mode: "insensitive" } },
              { name: { contains: "batik", mode: "insensitive" } },
            ],
          },
          select: { id: true, code: true, name: true },
        });
        const seragamIdSet = new Set(seragamMasters.map((s) => s.id));

        let tookSeragamJadi = false;
        for (const it of items) {
          if (seragamIdSet.has(it.barangId)) {
            // Jika status SUDAH dan kodeUkuran terisi serta BUKAN KAIN
            if (it.status === "SUDAH" && it.kodeUkuran && it.kodeUkuran !== "KAIN") {
              tookSeragamJadi = true;
              break;
            }
          }
        }

        let targetInvoice = fullJamaah.group.invoices?.[0];
        // Jika belum ada invoice aktif sama sekali, buat invoice baru untuk rombongan
        if (!targetInvoice && fullJamaah.group.id) {
          const invNo = `INV/${fullJamaah.group.kodeRegistrasi || fullJamaah.group.id}`;
          targetInvoice = await prisma.invoice.create({
            data: {
              nomorInvoice: invNo,
              groupId: fullJamaah.group.id,
              tipe: "tambahan",
              jumlah: 0,
              sisaTagihan: 0,
              status: "unpaid",
              jatuhTempo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
            include: { items: true },
          });
        }

        if (targetInvoice) {
          const isTargetJahitItem = (desc: string) => {
            const d = desc.toLowerCase();
            return (
              (d.includes("ongkos jahit") || d.includes("jahit seragam")) &&
              (desc.includes(fullJamaah.namaLengkap) ||
                desc.includes(fullJamaah.nomorPeserta) ||
                desc.includes(fullJamaah.registrationId))
            );
          };

          const existingJahit = (targetInvoice.items || []).find(
            (item) => item.status === "active" && isTargetJahitItem(item.deskripsi || "")
          );

          if (tookSeragamJadi && !existingJahit) {
            // Tambahkan item invoice ongkos jahit Rp 100.000
            await prisma.invoiceItem.create({
              data: {
                invoiceId: targetInvoice.id,
                kategori: "tambahan",
                deskripsi: `Ongkos Jahit Seragam Batik (${fullJamaah.namaLengkap})`,
                qty: 1,
                hargaSatuan: 100000,
                jumlah: 100000,
                status: "active",
              },
            });

            const activeItems = await prisma.invoiceItem.findMany({
              where: { invoiceId: targetInvoice.id, status: "active" },
            });
            const newTotal = activeItems.reduce((sum, it) => sum + it.jumlah, 0);
            const payments = await prisma.pembayaran.aggregate({
              where: { invoiceId: targetInvoice.id, status: "verified" },
              _sum: { jumlah: true },
            });
            const totalBayar = payments._sum.jumlah || 0;
            const newSisa = Math.max(0, newTotal - totalBayar);

            await prisma.invoice.update({
              where: { id: targetInvoice.id },
              data: { jumlah: newTotal, sisaTagihan: newSisa },
            });

            await prisma.registrationGroup.update({
              where: { id: fullJamaah.group.id },
              data: {
                totalTagihan: { increment: 100000 },
                sisaPembayaran: { increment: 100000 },
              },
            });
          } else if (!tookSeragamJadi && existingJahit) {
            // Batalkan item invoice ongkos jahit karena beralih ke KAIN atau dibatalkan
            await prisma.invoiceItem.update({
              where: { id: existingJahit.id },
              data: {
                status: "cancelled",
                cancelledAt: new Date(),
                cancelledBy: petugasName,
                cancellationReason: "Ganti ke Bahan Kain / Batal Seragam Jadi",
              },
            });

            const activeItems = await prisma.invoiceItem.findMany({
              where: { invoiceId: targetInvoice.id, status: "active" },
            });
            const newTotal = activeItems.reduce((sum, it) => sum + it.jumlah, 0);
            const payments = await prisma.pembayaran.aggregate({
              where: { invoiceId: targetInvoice.id, status: "verified" },
              _sum: { jumlah: true },
            });
            const totalBayar = payments._sum.jumlah || 0;
            const newSisa = Math.max(0, newTotal - totalBayar);

            await prisma.invoice.update({
              where: { id: targetInvoice.id },
              data: { jumlah: newTotal, sisaTagihan: newSisa },
            });

            await prisma.registrationGroup.update({
              where: { id: fullJamaah.group.id },
              data: {
                totalTagihan: { decrement: 100000 },
                sisaPembayaran: { decrement: 100000 },
              },
            });
          }
        }
      }
    } catch (invoiceErr) {
      console.error("[AUTO ONGKOS JAHIT ERROR]", invoiceErr);
    }

    return NextResponse.json({ success: true, data: updatedJamaah });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
