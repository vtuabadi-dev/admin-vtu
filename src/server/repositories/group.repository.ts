import { prisma } from "@/server/db/client";
import type {
  RegistrationGroup,
  GroupPaymentSummary,
  Pembayaran,
  Invoice,
  InvoiceSplitConfig,
} from "@/shared/types";

function mapGroup(row: any): RegistrationGroup {
  return {
    id: row.id,
    kodeRegistrasi: row.kodeRegistrasi,
    namaGroup: row.namaGroup,
    ketuaGroupId: row.ketuaGroupId,
    paketKeberangkatanId: row.paketKeberangkatanId,
    jumlahAnggota: row.jumlahAnggota,
    totalTagihan: row.totalTagihan,
    totalPembayaran: row.totalPembayaran,
    sisaPembayaran: row.sisaPembayaran,
    status: row.status,
    anggotaIds: row.anggota?.map((a: any) => a.id) ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapPembayaran(p: any): Pembayaran {
  return {
    id: p.id,
    groupId: p.groupId,
    invoiceId: p.invoiceId ?? undefined,
    jumlah: p.jumlah,
    metode: p.metode,
    tanggal: p.tanggal.toISOString(),
    buktiUrl: p.buktiUrl ?? undefined,
    status: p.status,
    sumber: p.sumber,
    verifiedBy: p.verifiedBy ?? undefined,
    alasanReject: p.alasanReject ?? undefined,
    reviewedBy: p.reviewedBy ?? undefined,
    reviewedAt: p.reviewedAt?.toISOString(),
    bankPengirim: p.bankPengirim ?? undefined,
    nomorRekening: p.nomorRekening ?? undefined,
    catatan: p.catatan ?? undefined,
    ocrData: p.ocrData as Pembayaran["ocrData"],
    alokasi: (p.alokasi ?? []).map((a: any) => ({
      jamaahId: a.jamaahId,
      namaJamaah: a.namaJamaah,
      jumlah: a.jumlah,
    })),
  };
}

function mapInvoice(inv: any): Invoice {
  return {
    id: inv.id,
    nomorInvoice: inv.nomorInvoice,
    groupId: inv.groupId,
    jamaahId: inv.jamaahId ?? undefined,
    tipe: inv.tipe,
    jumlah: inv.jumlah,
    sisaTagihan: inv.sisaTagihan,
    status: inv.status,
    jatuhTempo: inv.jatuhTempo.toISOString(),
    items: (inv.items ?? []).map((it: any) => ({
      id: it.id,
      invoiceId: it.invoiceId,
      kategori: it.kategori,
      deskripsi: it.deskripsi,
      qty: it.qty,
      hargaSatuan: it.hargaSatuan,
      jumlah: it.jumlah,
      status: it.status,
      cancelledAt: it.cancelledAt?.toISOString(),
      cancelledBy: it.cancelledBy ?? undefined,
      cancellationReason: it.cancellationReason ?? undefined,
    })),
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
  };
}

// ────────────────────────────────────────────────────────────
// Queries
// ────────────────────────────────────────────────────────────

export const groupRepo = {
  async findAll(params?: { status?: string; keberangkatanId?: string; limit?: number; offset?: number }) {
    const where: any = {};
    if (params?.status) where.status = params.status;
    if (params?.keberangkatanId) where.paketKeberangkatanId = params.keberangkatanId;

    const [rows, total] = await Promise.all([
      prisma.registrationGroup.findMany({
        where,
        include: { anggota: true },
        take: params?.limit,
        skip: params?.offset,
        orderBy: { createdAt: "desc" },
      }),
      prisma.registrationGroup.count({ where }),
    ]);
    return { data: rows.map(mapGroup), total };
  },

  async findById(id: string) {
    const row = await prisma.registrationGroup.findUnique({ where: { id }, include: { anggota: true } });
    return row ? mapGroup(row) : null;
  },

  async findByKode(kodeRegistrasi: string) {
    const row = await prisma.registrationGroup.findUnique({ where: { kodeRegistrasi }, include: { anggota: true } });
    return row ? mapGroup(row) : null;
  },

  async create(data: Omit<RegistrationGroup, "id" | "createdAt" | "updatedAt">) {
    const row = await prisma.registrationGroup.create({
      data: {
        kodeRegistrasi: data.kodeRegistrasi,
        namaGroup: data.namaGroup,
        ketuaGroupId: data.ketuaGroupId,
        paketKeberangkatanId: data.paketKeberangkatanId,
        jumlahAnggota: data.jumlahAnggota,
        totalTagihan: data.totalTagihan,
        totalPembayaran: data.totalPembayaran,
        sisaPembayaran: data.sisaPembayaran,
        status: data.status,
      },
      include: { anggota: true },
    });
    return mapGroup(row);
  },

  async getPaymentSummary(groupId: string): Promise<GroupPaymentSummary | null> {
    const row = await prisma.registrationGroup.findUnique({
      where: { id: groupId },
      include: {
        anggota: { include: { dokumen: true } },
        pembayaran: { include: { alokasi: true } },
        invoices: { include: { items: true } },
      },
    });
    if (!row) return null;

    return {
      groupId: row.id,
      kodeRegistrasi: row.kodeRegistrasi,
      namaGroup: row.namaGroup,
      totalTagihan: row.totalTagihan,
      totalPembayaran: row.totalPembayaran,
      sisaPembayaran: row.sisaPembayaran,
      status: paymentStatus(row.totalPembayaran, row.totalTagihan),
      jumlahAnggota: row.jumlahAnggota,
      anggota: row.anggota.map((a: any) => ({
        id: a.id,
        registrationId: a.registrationId,
        groupId: a.groupId,
        nomorPeserta: a.nomorPeserta,
        namaLengkap: a.namaLengkap,
        namaAyah: a.namaAyah,
        jenisKelamin: a.jenisKelamin,
        tempatLahir: a.tempatLahir,
        tanggalLahir: a.tanggalLahir.toISOString(),
        nik: a.nik,
        nomorPaspor: a.nomorPaspor,
        masaBerlakuPaspor: a.masaBerlakuPaspor.toISOString(),
        nomorTelepon: a.nomorTelepon,
        email: a.email,
        alamat: a.alamat,
        provinsi: a.provinsi,
        kota: a.kota,
        kecamatan: a.kecamatan,
        kelurahan: a.kelurahan,
        status: a.status,
        hotelMekkah: a.hotelMekkah,
        hotelMadinah: a.hotelMadinah,
        syaratDisetujui: a.syaratDisetujui,
        dokumen: [],
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
      pembayaran: row.pembayaran.map(mapPembayaran),
      invoices: row.invoices.map(mapInvoice),
    };
  },

  async getAllPaymentSummaries(): Promise<GroupPaymentSummary[]> {
    const rows = await prisma.registrationGroup.findMany({
      include: {
        anggota: { include: { dokumen: true } },
        pembayaran: { include: { alokasi: true } },
        invoices: { include: { items: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({
      groupId: row.id,
      kodeRegistrasi: row.kodeRegistrasi,
      namaGroup: row.namaGroup,
      totalTagihan: row.totalTagihan,
      totalPembayaran: row.totalPembayaran,
      sisaPembayaran: row.sisaPembayaran,
      status: paymentStatus(row.totalPembayaran, row.totalTagihan),
      jumlahAnggota: row.jumlahAnggota,
      anggota: row.anggota.map((a: any) => ({
        id: a.id,
        registrationId: a.registrationId,
        groupId: a.groupId,
        nomorPeserta: a.nomorPeserta,
        namaLengkap: a.namaLengkap,
        namaAyah: a.namaAyah,
        jenisKelamin: a.jenisKelamin,
        tempatLahir: a.tempatLahir,
        tanggalLahir: a.tanggalLahir.toISOString(),
        nik: a.nik,
        nomorPaspor: a.nomorPaspor,
        masaBerlakuPaspor: a.masaBerlakuPaspor.toISOString(),
        nomorTelepon: a.nomorTelepon,
        email: a.email,
        alamat: a.alamat,
        provinsi: a.provinsi,
        kota: a.kota,
        kecamatan: a.kecamatan,
        kelurahan: a.kelurahan,
        status: a.status,
        hotelMekkah: a.hotelMekkah,
        hotelMadinah: a.hotelMadinah,
        syaratDisetujui: a.syaratDisetujui,
        dokumen: [],
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
      pembayaran: row.pembayaran.map(mapPembayaran),
      invoices: row.invoices.map(mapInvoice),
    }));
  },

  async getInvoiceSplitConfig(groupId: string): Promise<InvoiceSplitConfig | null> {
    const row = await prisma.invoiceSplitConfig.findUnique({ where: { groupId } });
    if (!row) return null;
    return {
      groupId: row.groupId,
      createdAt: row.createdAt.toISOString(),
      splits: row.splits as unknown as InvoiceSplitConfig["splits"],
    };
  },

  async saveInvoiceSplitConfig(groupId: string, splits: InvoiceSplitConfig["splits"]) {
    const row = await prisma.invoiceSplitConfig.upsert({
      where: { groupId },
      update: { splits: splits as any },
      create: { groupId, splits: splits as any },
    });
    return {
      groupId: row.groupId,
      createdAt: row.createdAt.toISOString(),
      splits: row.splits as unknown as InvoiceSplitConfig["splits"],
    };
  },
};

function paymentStatus(totalPembayaran: number, totalTagihan: number): GroupPaymentSummary["status"] {
  if (totalTagihan === 0) return "lunas";
  const ratio = totalPembayaran / totalTagihan;
  if (ratio >= 1) return "lunas";
  if (ratio >= 0.9) return "hampir_lunas";
  if (ratio >= 0.5) return "cicilan";
  if (ratio > 0) return "dp";
  return "dp";
}
