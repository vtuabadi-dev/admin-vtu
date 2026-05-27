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
          create: data.alokasi.map((a) => ({
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

  async getReviewQueue() {
    const rows = await prisma.pembayaran.findMany({
      where: { status: "pending", sumber: "jamaah" },
      include: { alokasi: true, group: { select: { kodeRegistrasi: true, namaGroup: true } } },
      orderBy: { tanggal: "asc" },
    });
    return rows.map((r) => ({
      ...mapPembayaran(r),
      kodeRegistrasi: (r as any).group?.kodeRegistrasi,
      namaGroup: (r as any).group?.namaGroup,
    }));
  },
};
