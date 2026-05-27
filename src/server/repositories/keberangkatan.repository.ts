import { prisma } from "@/server/db/client";
import type {
  Keberangkatan,
  PackageIntelligence,
  FinalizationResult,
  FinalizationCheck,
  PackageReadinessScore,
} from "@/shared/types";

function mapKeberangkatan(row: any): Keberangkatan {
  return {
    id: row.id,
    kode: row.kode,
    namaPaket: row.namaPaket,
    hargaPaket: row.hargaPaket,
    tanggalBerangkat: row.tanggalBerangkat.toISOString(),
    tanggalPulang: row.tanggalPulang.toISOString(),
    maskapai: row.maskapai,
    nomorPenerbangan: row.nomorPenerbangan,
    hotelMekkah: row.hotelMekkah,
    hotelMadinah: row.hotelMadinah,
    hotelOptions: (row.hotelOptions as Keberangkatan["hotelOptions"]) ?? [],
    status: row.status,
    kuota: row.kuota,
    terisi: row.terisi,
    jamaahIds: (row.groups as any[])?.flatMap((g: any) => g.anggota?.map((a: any) => a.id) ?? []) ?? [],
  };
}

// ────────────────────────────────────────────────────────────
// Queries
// ────────────────────────────────────────────────────────────

export const keberangkatanRepo = {
  async findAll(params?: { status?: string; limit?: number; offset?: number }) {
    const where: any = {};
    if (params?.status) where.status = params.status;

    const [rows, total] = await Promise.all([
      prisma.keberangkatan.findMany({
        where,
        include: { groups: { include: { anggota: { select: { id: true } } } } },
        take: params?.limit,
        skip: params?.offset,
        orderBy: { tanggalBerangkat: "asc" },
      }),
      prisma.keberangkatan.count({ where }),
    ]);
    return { data: rows.map(mapKeberangkatan), total };
  },

  async findById(id: string) {
    const row = await prisma.keberangkatan.findUnique({
      where: { id },
      include: { groups: { include: { anggota: { select: { id: true } } } } },
    });
    return row ? mapKeberangkatan(row) : null;
  },

  async create(data: Omit<Keberangkatan, "id" | "jamaahIds">) {
    const row = await prisma.keberangkatan.create({
      data: {
        kode: data.kode,
        namaPaket: data.namaPaket,
        hargaPaket: data.hargaPaket,
        tanggalBerangkat: new Date(data.tanggalBerangkat),
        tanggalPulang: new Date(data.tanggalPulang),
        maskapai: data.maskapai,
        nomorPenerbangan: data.nomorPenerbangan,
        hotelMekkah: data.hotelMekkah,
        hotelMadinah: data.hotelMadinah,
        hotelOptions: data.hotelOptions,
        status: data.status,
        kuota: data.kuota,
        terisi: data.terisi,
      },
      include: { groups: { include: { anggota: { select: { id: true } } } } },
    });
    return mapKeberangkatan(row);
  },

  async update(id: string, data: Partial<Keberangkatan>) {
    const updateData: any = {};
    if (data.namaPaket !== undefined) updateData.namaPaket = data.namaPaket;
    if (data.hargaPaket !== undefined) updateData.hargaPaket = data.hargaPaket;
    if (data.tanggalBerangkat !== undefined) updateData.tanggalBerangkat = new Date(data.tanggalBerangkat);
    if (data.tanggalPulang !== undefined) updateData.tanggalPulang = new Date(data.tanggalPulang);
    if (data.maskapai !== undefined) updateData.maskapai = data.maskapai;
    if (data.nomorPenerbangan !== undefined) updateData.nomorPenerbangan = data.nomorPenerbangan;
    if (data.hotelOptions !== undefined) updateData.hotelOptions = data.hotelOptions;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.kuota !== undefined) updateData.kuota = data.kuota;
    if (data.terisi !== undefined) updateData.terisi = data.terisi;

    const row = await prisma.keberangkatan.update({
      where: { id },
      data: updateData,
      include: { groups: { include: { anggota: { select: { id: true } } } } },
    });
    return mapKeberangkatan(row);
  },

  async getPackageIntelligence(keberangkatanId: string): Promise<PackageIntelligence | null> {
    const row = await prisma.keberangkatan.findUnique({
      where: { id: keberangkatanId },
      include: {
        groups: {
          include: {
            anggota: { include: { dokumen: true } },
            pembayaran: true,
          },
        },
        roomings: true,
        manifests: true,
      },
    });
    if (!row) return null;

    const allJamaah = row.groups.flatMap((g) => g.anggota);
    const unpaidCount = row.groups.reduce((sum, g) => sum + (g.sisaPembayaran > 0 ? 1 : 0), 0);
    const dokumenPending = allJamaah.filter((j) => j.dokumen.some((d) => d.status !== "verified" && d.status !== "lengkap")).length;
    const roomingIncomplete = row.roomings.filter((r) => r.status !== "final").length;
    const manifestIncomplete = row.manifests.filter((m) => m.status !== "final" && m.status !== "submitted").length;
    const warningCount = [unpaidCount > 0 ? 1 : 0, dokumenPending > 0 ? 1 : 0, roomingIncomplete > 0 ? 1 : 0, manifestIncomplete > 0 ? 1 : 0].filter(Boolean).length;

    return {
      totalJamaah: allJamaah.length,
      unpaidCount,
      dokumenPending,
      roomingIncomplete,
      manifestIncomplete,
      warningCount,
      readinessBreakdown: row.groups.reduce((acc, g) => {
        acc[g.kodeRegistrasi] = g.sisaPembayaran <= 0 ? 1 : 0;
        return acc;
      }, {} as Record<string, number>),
    };
  },

  async getFinalizationResult(keberangkatanId: string): Promise<FinalizationResult> {
    const row = await prisma.keberangkatan.findUnique({
      where: { id: keberangkatanId },
      include: {
        groups: {
          include: {
            anggota: { include: { dokumen: true } },
            invoices: true,
          },
        },
        roomings: { include: { kamar: { include: { penghuni: true } } } },
        manifests: true,
      },
    });
    if (!row) throw new Error("Keberangkatan not found");

    const checks: FinalizationCheck[] = [
      {
        key: "all_lunas",
        label: "Semua jamaah lunas",
        passed: row.groups.every((g) => g.sisaPembayaran <= 0),
        blocking: true,
        detail: row.groups.filter((g) => g.sisaPembayaran > 0).map((g) => `${g.kodeRegistrasi}: sisa ${g.sisaPembayaran}`).join("; ") || undefined,
      },
      {
        key: "dokumen_verified",
        label: "Dokumen semua jamaah terverifikasi",
        passed: row.groups.every((g) => g.anggota.every((a) => a.dokumen.filter((d) => d.wajib).every((d) => d.status === "verified" || d.status === "lengkap"))),
        blocking: true,
      },
      {
        key: "manifest_final",
        label: "Manifest sudah final",
        passed: row.manifests.length > 0 && row.manifests.every((m) => m.status === "final" || m.status === "submitted"),
        blocking: true,
      },
      {
        key: "rooming_final",
        label: "Rooming sudah final",
        passed: row.roomings.length > 0 && row.roomings.every((r) => r.status === "final"),
        blocking: false,
      },
      {
        key: "kuota_terpenuhi",
        label: "Kuota terpenuhi",
        passed: row.terisi >= row.kuota,
        blocking: false,
        detail: `${row.terisi}/${row.kuota} terisi`,
      },
    ];

    const blockingCount = checks.filter((c) => !c.passed && c.blocking).length;
    return {
      canFinalize: checks.every((c) => c.passed || !c.blocking),
      checks,
      blockingCount,
      totalCount: checks.length,
    };
  },

  async getReadinessScore(keberangkatanId: string): Promise<PackageReadinessScore> {
    const row = await prisma.keberangkatan.findUnique({
      where: { id: keberangkatanId },
      include: {
        groups: {
          include: {
            anggota: { include: { dokumen: true } },
            pembayaran: true,
          },
        },
        roomings: true,
        manifests: true,
      },
    });
    if (!row) throw new Error("Keberangkatan not found");

    const allJamaah = row.groups.flatMap((g) => g.anggota);
    const totalJamaah = allJamaah.length || 1;

    const paymentScore = row.groups.reduce((sum, g) => sum + (g.totalTagihan > 0 ? g.totalPembayaran / g.totalTagihan : 1), 0) / (row.groups.length || 1) * 100;
    const documentScore = allJamaah.filter((j) => j.dokumen.filter((d) => d.wajib).every((d) => d.status === "verified" || d.status === "lengkap")).length / totalJamaah * 100;
    const manifestScore = row.manifests.length > 0 ? (row.manifests.filter((m) => m.status === "final" || m.status === "submitted").length / row.manifests.length) * 100 : 0;
    const roomingScore = row.roomings.length > 0 ? (row.roomings.filter((r) => r.status === "final").length / row.roomings.length) * 100 : 0;
    const operationalScore = row.status === "ready" || row.status === "departed" ? 100 : row.status === "preparing" ? 50 : 0;

    const scores = [
      { label: "Pembayaran", score: paymentScore, weight: 30 },
      { label: "Dokumen", score: documentScore, weight: 25 },
      { label: "Manifest", score: manifestScore, weight: 20 },
      { label: "Rooming", score: roomingScore, weight: 15 },
      { label: "Operasional", score: operationalScore, weight: 10 },
    ];

    const overallScore = scores.reduce((sum, s) => sum + (s.score * s.weight) / 100, 0);

    return {
      overallScore: Math.round(overallScore),
      paymentScore: Math.round(paymentScore),
      documentScore: Math.round(documentScore),
      manifestScore: Math.round(manifestScore),
      roomingScore: Math.round(roomingScore),
      operationalScore: Math.round(operationalScore),
      breakdown: scores.map((s) => ({ ...s, score: Math.round(s.score) })),
    };
  },
};
