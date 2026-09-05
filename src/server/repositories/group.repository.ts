import { prisma } from "@/server/db/client";
import type {
  RegistrationGroup,
  GroupPaymentSummary,
  Pembayaran,
  Invoice,
  InvoiceSplitConfig,
} from "@/shared/types";

function mapGroup(row: any): RegistrationGroup {
  const req = row.registrationRequests && row.registrationRequests.length > 0 ? row.registrationRequests[0] : null;
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
    hotelUpgrade: req?.hotelUpgrade || row.hotelUpgrade || undefined,
    roomUpgrade: req?.roomUpgrade || row.roomUpgrade || undefined,
    isKeretaCepat: row.isKeretaCepat ?? undefined,
    isCityTourThoif: row.isCityTourThoif ?? undefined,
    anggotaIds: row.anggota?.map((a: any) => a.id) ?? [],
    invoices: (row.invoices ?? []).map(mapInvoice),
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
        include: {
          anggota: true,
          registrationRequests: { select: { hotelUpgrade: true, roomUpgrade: true } },
          invoices: { include: { items: true } },
        },
        take: params?.limit,
        skip: params?.offset,
        orderBy: { createdAt: "asc" },
      }),
      prisma.registrationGroup.count({ where }),
    ]);
    return { data: rows.map(mapGroup), total };
  },

  async findById(id: string) {
    const row = await prisma.registrationGroup.findUnique({
      where: { id },
      include: {
        anggota: true,
        registrationRequests: { select: { hotelUpgrade: true, roomUpgrade: true } },
        invoices: { include: { items: true } },
      },
    });
    return row ? mapGroup(row) : null;
  },

  async findByKode(kodeRegistrasi: string) {
    const trimmed = kodeRegistrasi.trim();
    const numMatch = trimmed.match(/\d+$/);
    const numSuffix = numMatch ? String(parseInt(numMatch[0], 10)).padStart(3, "0") : null;

    const row: any = await prisma.registrationGroup.findFirst({
      where: {
        OR: [
          { kodeRegistrasi: trimmed },
          { kodeRegistrasi: { equals: trimmed, mode: "insensitive" as const } },
          { id: trimmed },
          { kodeRegistrasi: { contains: trimmed, mode: "insensitive" as const } },
          ...(numSuffix
            ? [
                { kodeRegistrasi: { contains: numSuffix, mode: "insensitive" as const } },
                { id: { contains: numSuffix, mode: "insensitive" as const } },
              ]
            : []),
        ],
      },
      include: {
        anggota: true,
        keberangkatan: { include: { paketUmroh: true } },
        registrationRequests: { select: { hotelUpgrade: true, roomUpgrade: true, nomorTelepon: true, emailPerwakilan: true } },
        ketuaGroup: true,
      },
    });

    if (row) return mapGroup(row);

    // Fallback search in RegistrationRequest
    const req: any = await prisma.registrationRequest.findFirst({
      where: {
        OR: [
          { kodeRegistrasi: trimmed },
          { kodeRegistrasi: { equals: trimmed, mode: "insensitive" as const } },
          { id: trimmed },
          { kodeRegistrasi: { contains: trimmed, mode: "insensitive" as const } },
          ...(numSuffix ? [{ kodeRegistrasi: { contains: numSuffix, mode: "insensitive" as const } }] : []),
        ],
      },
      include: {
        keberangkatan: { include: { paketUmroh: true } },
        members: true,
        group: {
          include: {
            anggota: true,
            keberangkatan: { include: { paketUmroh: true } },
            ketuaGroup: true,
          },
        },
      },
    });

    if (req) {
      if (req.group) {
        return mapGroup(req.group);
      }
      return {
        id: req.id,
        kodeRegistrasi: req.kodeRegistrasi,
        namaGroup: `Group ${req.namaPerwakilan}`,
        ketuaGroupId: req.members[0]?.id || "",
        paketKeberangkatanId: req.paketId,
        jumlahAnggota: req.paxCount,
        totalTagihan: (req.keberangkatan?.hargaPaket ?? 0) * req.paxCount,
        totalPembayaran: 0,
        sisaPembayaran: (req.keberangkatan?.hargaPaket ?? 0) * req.paxCount,
        status: "active",
        hotelUpgrade: req.hotelUpgrade || undefined,
        roomUpgrade: req.roomUpgrade || undefined,
        anggotaIds: req.members ? req.members.map((m: any) => m.id) : [],
        createdAt: req.createdAt ? req.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: req.updatedAt ? req.updatedAt.toISOString() : new Date().toISOString(),
        kontakNama: req.namaPerwakilan,
        kontakHp: req.nomorTelepon,
        paketKeberangkatan: req.keberangkatan
          ? { tanggalBerangkat: req.keberangkatan.tanggalBerangkat?.toISOString() }
          : undefined,
      } as any;
    }

    return null;
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

  async update(id: string, data: any) {
    const row = await prisma.registrationGroup.update({
      where: { id },
      data,
      include: { anggota: true },
    });
    return mapGroup(row);
  },

  async getPaymentSummary(groupId: string): Promise<GroupPaymentSummary | null> {
    const trimmed = groupId.trim();
    const numMatch = trimmed.match(/\d+$/);
    const numSuffix = numMatch ? String(parseInt(numMatch[0], 10)).padStart(3, "0") : null;

    let row: any = await prisma.registrationGroup.findFirst({
      where: {
        OR: [
          { id: trimmed },
          { kodeRegistrasi: trimmed },
          { kodeRegistrasi: { equals: trimmed, mode: "insensitive" as const } },
          { kodeRegistrasi: { contains: trimmed, mode: "insensitive" as const } },
          ...(numSuffix
            ? [
                { kodeRegistrasi: { contains: numSuffix, mode: "insensitive" as const } },
                { id: { contains: numSuffix, mode: "insensitive" as const } },
              ]
            : []),
        ],
      },
      include: {
        anggota: { include: { dokumen: true } },
        pembayaran: { include: { alokasi: true } },
        invoices: { include: { items: true } },
        keberangkatan: true,
      },
    });

    if (!row) {
      const req: any = await prisma.registrationRequest.findFirst({
        where: {
          OR: [
            { id: trimmed },
            { kodeRegistrasi: trimmed },
            { kodeRegistrasi: { equals: trimmed, mode: "insensitive" as const } },
            { kodeRegistrasi: { contains: trimmed, mode: "insensitive" as const } },
            ...(numSuffix ? [{ kodeRegistrasi: { contains: numSuffix, mode: "insensitive" as const } }] : []),
          ],
        },
        include: {
          group: {
            include: {
              anggota: { include: { dokumen: true } },
              pembayaran: { include: { alokasi: true } },
              invoices: { include: { items: true } },
            },
          },
          members: true,
          keberangkatan: true,
        },
      });

      if (req?.group) {
        row = req.group;
      } else if (req) {
        const totalHarga = (req.keberangkatan?.hargaPaket ?? 0) * req.paxCount;
        return {
          groupId: req.id,
          kodeRegistrasi: req.kodeRegistrasi,
          namaGroup: `Group ${req.namaPerwakilan}`,
          totalTagihan: totalHarga,
          totalPembayaran: 0,
          sisaPembayaran: totalHarga,
          status: "dp",
          jumlahAnggota: req.paxCount,
          anggota: req.members.map((m: any) => ({
            id: m.id,
            registrationId: req.id,
            groupId: req.id,
            nomorPeserta: `PST-${m.id.slice(-6).toUpperCase()}`,
            namaLengkap: m.namaLengkap,
            namaAyah: m.namaAyah || "",
            jenisKelamin: m.jenisKelamin,
            tempatLahir: m.tempatLahir || "Jakarta",
            tanggalLahir: m.tanggalLahir ? (typeof m.tanggalLahir === "string" ? m.tanggalLahir : m.tanggalLahir.toISOString()) : new Date().toISOString(),
            nik: m.nik || "",
            nomorPaspor: m.nomorPaspor || "-",
            masaBerlakuPaspor: m.masaBerlakuPaspor ? (typeof m.masaBerlakuPaspor === "string" ? m.masaBerlakuPaspor : m.masaBerlakuPaspor.toISOString()) : new Date().toISOString(),
            nomorTelepon: req.nomorTelepon,
            email: req.emailPerwakilan,
            alamat: "",
            provinsi: "",
            kota: "",
            kecamatan: "",
            kelurahan: "",
            status: "registered",
            hotelMekkah: "Hotel Setaraf Bintang 5",
            hotelMadinah: "Hotel Setaraf Bintang 4",
            syaratDisetujui: true,
            dokumen: [],
            createdAt: m.createdAt ? (typeof m.createdAt === "string" ? m.createdAt : m.createdAt.toISOString()) : new Date().toISOString(),
            updatedAt: m.updatedAt ? (typeof m.updatedAt === "string" ? m.updatedAt : m.updatedAt.toISOString()) : new Date().toISOString(),
          })),
          pembayaran: [],
          invoices: [],
        };
      }
    }

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
      keberangkatan: row.keberangkatan
        ? {
            id: row.keberangkatan.id,
            namaPaket: row.keberangkatan.namaPaket,
            hargaPaket: row.keberangkatan.hargaPaket,
            tanggalBerangkat: row.keberangkatan.tanggalBerangkat
              ? row.keberangkatan.tanggalBerangkat.toISOString()
              : undefined,
          }
        : undefined,
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
    return rows.map((row: any) => ({
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
