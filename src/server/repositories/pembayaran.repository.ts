import { prisma } from "@/server/db/client";
import type { Pembayaran } from "@/shared/types";

function mapPembayaran(row: any): Pembayaran {
  return {
    id: row.id,
    groupId: row.groupId,
    invoiceId: row.invoiceId ?? undefined,
    jumlah: row.jumlah,
    metode: row.metode,
    tanggal: row.tanggal.toISOString(),
    buktiUrl: row.buktiUrl ?? undefined,
    status: row.status,
    sumber: row.sumber,
    verifiedBy: row.verifiedBy ?? undefined,
    alasanReject: row.alasanReject ?? undefined,
    reviewedBy: row.reviewedBy ?? undefined,
    reviewedAt: row.reviewedAt?.toISOString(),
    bankPengirim: row.bankPengirim ?? undefined,
    nomorRekening: row.nomorRekening ?? undefined,
    catatan: row.catatan ?? undefined,
    ocrData: row.ocrData as Pembayaran["ocrData"],
    alokasi: (row.alokasi ?? []).map((a: any) => ({
      jamaahId: a.jamaahId,
      namaJamaah: a.namaJamaah,
      jumlah: a.jumlah,
    })),
  };
}

// ────────────────────────────────────────────────────────────
// Queries
// ────────────────────────────────────────────────────────────

export const pembayaranRepo = {
  async findAll(params?: { groupId?: string; status?: string; limit?: number; offset?: number }) {
    const where: any = {};
    if (params?.groupId) where.groupId = params.groupId;
    if (params?.status) where.status = params.status;

    const [rows, total] = await Promise.all([
      prisma.pembayaran.findMany({ where, include: { alokasi: true }, take: params?.limit, skip: params?.offset, orderBy: { tanggal: "desc" } }),
      prisma.pembayaran.count({ where }),
    ]);
    return { data: rows.map(mapPembayaran), total };
  },

  async findById(id: string) {
    const row = await prisma.pembayaran.findUnique({ where: { id }, include: { alokasi: true } });
    return row ? mapPembayaran(row) : null;
  },

  async findByGroup(groupId: string) {
    const rows = await prisma.pembayaran.findMany({ where: { groupId }, include: { alokasi: true }, orderBy: { tanggal: "desc" } });
    return rows.map(mapPembayaran);
  },

  async create(data: Omit<Pembayaran, "id" | "verifiedBy" | "alasanReject" | "reviewedBy" | "reviewedAt"> & { alokasi: Pembayaran["alokasi"] }) {
    const row = await prisma.pembayaran.create({
      data: {
        groupId: data.groupId,
        invoiceId: data.invoiceId ?? null,
        jumlah: data.jumlah,
        metode: data.metode,
        tanggal: new Date(data.tanggal),
        buktiUrl: data.buktiUrl ?? null,
        status: data.status,
        sumber: data.sumber,
        bankPengirim: data.bankPengirim ?? null,
        nomorRekening: data.nomorRekening ?? null,
        catatan: data.catatan ?? null,
        ocrData: data.ocrData as any,
        alokasi: {
          create: data.alokasi.map((a: any) => ({
            jamaahId: a.jamaahId,
            namaJamaah: a.namaJamaah,
            jumlah: a.jumlah,
          })),
        },
      },
      include: { alokasi: true },
    });
    return mapPembayaran(row);
  },

  async approve(id: string, verifiedBy: string) {
    const row = await prisma.pembayaran.update({
      where: { id },
      data: { status: "verified", verifiedBy, reviewedBy: verifiedBy, reviewedAt: new Date() },
      include: { alokasi: true },
    });

    // Update group totalPembayaran
    const allVerified = await prisma.pembayaran.aggregate({
      where: { groupId: row.groupId, status: "verified" },
      _sum: { jumlah: true },
    });
    await prisma.registrationGroup.update({
      where: { id: row.groupId },
      data: {
        totalPembayaran: allVerified._sum.jumlah ?? 0,
        sisaPembayaran: { set: 0 }, // will be calculated below
      },
    });
    // Recalculate sisa
    const group = await prisma.registrationGroup.findUnique({ where: { id: row.groupId } });
    if (group) {
      await prisma.registrationGroup.update({
        where: { id: row.groupId },
        data: { sisaPembayaran: Math.max(0, group.totalTagihan - (allVerified._sum.jumlah ?? 0)) },
      });
    }

    // Update invoice sisaTagihan if linked
    if (row.invoiceId) {
      const invoice = await prisma.invoice.findUnique({ where: { id: row.invoiceId } });
      if (invoice) {
        const invPayments = await prisma.pembayaran.aggregate({
          where: { invoiceId: row.invoiceId, status: "verified" },
          _sum: { jumlah: true },
        });
        await prisma.invoice.update({
          where: { id: row.invoiceId },
          data: { sisaTagihan: Math.max(0, invoice.jumlah - (invPayments._sum.jumlah ?? 0)) },
        });
      }
    }

    return mapPembayaran(row);
  },

  async reject(id: string, alasanReject: string, reviewedBy: string) {
    const row = await prisma.pembayaran.update({
      where: { id },
      data: { status: "rejected", alasanReject, reviewedBy, reviewedAt: new Date() },
      include: { alokasi: true },
    });
    return mapPembayaran(row);
  },

  async getReviewQueue(statusFilter?: string) {
    // 1. Auto-sync any RegistrationRequest that has DP proof uploaded or PENDING_REVIEW status but no Pembayaran record yet
    try {
      const pendingRegs = await prisma.registrationRequest.findMany({
        where: {
          OR: [
            { status: "PENDING_REVIEW" },
            { catatanAdmin: { contains: "[Bukti DP Uploaded" } },
          ],
        },
        include: {
          keberangkatan: true,
        },
      });

      for (const reg of pendingRegs) {
        // Extract buktiUrl from catatanAdmin if available
        let extractedBuktiUrl: string | undefined = undefined;
        if (reg.catatanAdmin) {
          const match = reg.catatanAdmin.match(/\[Bukti DP Uploaded[^\]]*\]:\s*([^\s\n]+)/);
          if (match?.[1] && match[1] !== "File" && match[1] !== "received") {
            extractedBuktiUrl = match[1];
          }
        }

        // Ensure RegistrationGroup exists
        let groupId = reg.groupId;
        let group = groupId
          ? await prisma.registrationGroup.findUnique({ where: { id: groupId } })
          : await prisma.registrationGroup.findFirst({ where: { kodeRegistrasi: reg.kodeRegistrasi } });

        if (!group) {
          // Find or create ketua Jamaah record for FK constraint
          const registrationId = `${reg.kodeRegistrasi}-1`;
          let ketua = await prisma.jamaah.findUnique({
            where: { registrationId },
          });

          if (!ketua) {
            const parts = reg.kodeRegistrasi.split("-");
            const year = parts[1] ?? new Date().getFullYear().toString();
            const seq = parts[2] ?? "00001";
            const nomorPeserta = `PS/${year}/${seq}/1`;

            ketua = await prisma.jamaah.create({
              data: {
                registrationId,
                groupId: "",
                nomorPeserta,
                namaLengkap: reg.namaPerwakilan,
                namaAyah: "",
                jenisKelamin: "L",
                tempatLahir: "-",
                tanggalLahir: new Date("2000-01-01"),
                nik: "",
                nomorPaspor: "",
                masaBerlakuPaspor: new Date("2030-01-01"),
                nomorTelepon: reg.nomorTelepon,
                email: reg.emailPerwakilan,
                alamat: "-",
                provinsi: "-",
                kota: "-",
                kecamatan: "-",
                kelurahan: "-",
                status: "registered",
                hotelMekkah: "",
                hotelMadinah: "",
                syaratDisetujui: reg.termsAccepted ?? true,
              },
            });
          }

          const totalTagihan = (reg.keberangkatan?.hargaPaket || 0) * (reg.paxCount || 1);
          group = await prisma.registrationGroup.create({
            data: {
              kodeRegistrasi: reg.kodeRegistrasi,
              namaGroup: `GRUP ${reg.namaPerwakilan}`,
              ketuaGroupId: ketua.id,
              paketKeberangkatanId: reg.paketId,
              jumlahAnggota: reg.paxCount,
              totalTagihan,
              totalPembayaran: 0,
              sisaPembayaran: totalTagihan,
              status: "active",
            },
          });

          await prisma.jamaah.update({
            where: { id: ketua.id },
            data: { groupId: group.id },
          });

          groupId = group.id;
          await prisma.registrationRequest.update({
            where: { id: reg.id },
            data: { groupId },
          });
        }

        // Check if Pembayaran rows exist for this group and deduplicate if multiple
        const existingPayments = await prisma.pembayaran.findMany({
          where: { groupId: group.id },
          orderBy: { createdAt: "desc" },
        });

        if (existingPayments.length === 0) {
          const nominalDp = 5000000 * (reg.paxCount || 1);
          await prisma.pembayaran.create({
            data: {
              groupId: group.id,
              jumlah: nominalDp,
              metode: "transfer",
              tanggal: reg.updatedAt || reg.createdAt,
              buktiUrl: extractedBuktiUrl,
              status: "pending",
              sumber: "jamaah",
              catatan: `DP Pendaftaran ${reg.paxCount} Pax - ${reg.namaPerwakilan} (${reg.kodeRegistrasi})`,
            },
          });
        } else {
          // If duplicate pending payments exist for this group, keep only the newest and remove duplicates
          const pendingDuplicates = existingPayments.filter((p) => p.status === "pending");
          if (pendingDuplicates.length > 1) {
            const [keep, ...removeList] = pendingDuplicates;
            const removeIds = removeList.map((p) => p.id);
            await prisma.pembayaran.deleteMany({
              where: { id: { in: removeIds } },
            });
            if (extractedBuktiUrl && keep && !keep.buktiUrl) {
              await prisma.pembayaran.update({
                where: { id: keep.id },
                data: { buktiUrl: extractedBuktiUrl },
              });
            }
          } else if (extractedBuktiUrl && existingPayments[0] && !existingPayments[0].buktiUrl) {
            await prisma.pembayaran.update({
              where: { id: existingPayments[0].id },
              data: { buktiUrl: extractedBuktiUrl },
            });
          }
        }
      }
    } catch (syncErr) {
      console.warn("[pembayaran-repo] Failed auto-syncing pending registrations to review queue:", syncErr);
    }

    // 2. Query all Pembayaran rows with full relations
    const whereClause: any = {};
    if (statusFilter && statusFilter !== "all") {
      whereClause.status = statusFilter;
    }
    const rows = await prisma.pembayaran.findMany({
      where: whereClause,
      include: {
        alokasi: true,
        group: {
          select: {
            id: true,
            kodeRegistrasi: true,
            namaGroup: true,
            totalTagihan: true,
            totalPembayaran: true,
            sisaPembayaran: true,
            keberangkatan: {
              select: {
                id: true,
                kode: true,
                namaPaket: true,
                tanggalBerangkat: true,
              },
            },
            anggota: {
              select: {
                id: true,
                namaLengkap: true,
                nomorPeserta: true,
                nomorTelepon: true,
                email: true,
              },
            },
            ketuaGroup: {
              select: {
                id: true,
                namaLengkap: true,
                nomorTelepon: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { tanggal: "desc" },
    });
    // Deduplicate mapped rows by unique groupId + status + sumber + buktiUrl so identical duplicate entries are never shown twice
    const seen = new Set<string>();
    const uniqueRows: any[] = [];
    for (const r of rows) {
      const key = `${r.groupId}_${r.status}_${r.sumber}_${r.jumlah}_${r.buktiUrl || ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRows.push(r);
      }
    }

    return uniqueRows.map((r: any) => ({
      ...mapPembayaran(r),
      kodeRegistrasi: (r as any).group?.kodeRegistrasi,
      namaGroup: (r as any).group?.namaGroup,
      group: (r as any).group,
    }));
  },
};
