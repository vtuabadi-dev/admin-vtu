import { prisma } from "@/server/db/client";
import { dokumenRepo } from "./dokumen.repository";
import type {
  Jamaah,
  StatusJamaah,
  ReadinessLevel,
  JamaahReadinessResult,
  ReadinessCheckItem,
} from "@/shared/types";

function mapJamaah(row: any): Jamaah {
  return {
    id: row.id,
    registrationId: row.registrationId,
    groupId: row.groupId,
    nomorPeserta: row.nomorPeserta,
    namaLengkap: row.namaLengkap,
    namaAyah: row.namaAyah,
    jenisKelamin: row.jenisKelamin,
    tempatLahir: row.tempatLahir,
    tanggalLahir: row.tanggalLahir.toISOString(),
    nik: row.nik,
    nomorPaspor: row.nomorPaspor,
    masaBerlakuPaspor: row.masaBerlakuPaspor.toISOString(),
    nomorTelepon: row.nomorTelepon,
    email: row.email,
    alamat: row.alamat,
    provinsi: row.provinsi,
    kota: row.kota,
    kecamatan: row.kecamatan,
    kelurahan: row.kelurahan,
    tandaTanganDigital: row.tandaTanganDigital,
    syaratDisetujui: row.syaratDisetujui,
    status: row.status as StatusJamaah,
    hotelMekkah: row.hotelMekkah,
    hotelMadinah: row.hotelMadinah,
    dokumen: (row.dokumen ?? []).map(dokumenRepo.mapDokumen),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}


// ────────────────────────────────────────────────────────────
// Queries
// ────────────────────────────────────────────────────────────

export const jamaahRepo = {
  async findAll(params?: { groupId?: string; status?: string; search?: string; limit?: number; offset?: number }) {
    const where: any = {};
    if (params?.groupId) where.groupId = params.groupId;
    if (params?.status) where.status = params.status;
    if (params?.search) {
      where.OR = [
        { namaLengkap: { contains: params.search, mode: "insensitive" } },
        { nomorPaspor: { contains: params.search, mode: "insensitive" } },
        { registrationId: { contains: params.search, mode: "insensitive" } },
      ];
    }
    const [rows, total] = await Promise.all([
      prisma.jamaah.findMany({ where, include: { dokumen: true }, take: params?.limit, skip: params?.offset, orderBy: { createdAt: "desc" } }),
      prisma.jamaah.count({ where }),
    ]);
    return { data: rows.map(mapJamaah), total };
  },

  async findById(id: string) {
    const row = await prisma.jamaah.findUnique({ where: { id }, include: { dokumen: true } });
    return row ? mapJamaah(row) : null;
  },

  async findByRegistrationId(registrationId: string) {
    const row = await prisma.jamaah.findUnique({ where: { registrationId }, include: { dokumen: true } });
    return row ? mapJamaah(row) : null;
  },

  async findByUserId(userId: string) {
    const row = await prisma.jamaah.findFirst({ where: { userId }, include: { dokumen: true } });
    return row ? mapJamaah(row) : null;
  },

  async findByGroup(groupId: string) {
    const rows = await prisma.jamaah.findMany({ where: { groupId }, include: { dokumen: true }, orderBy: { nomorPeserta: "asc" } });
    return rows.map(mapJamaah);
  },

  async countByStatus() {
    const rows = await prisma.jamaah.groupBy({ by: ["status"], _count: true });
    return Object.fromEntries(rows.map((r) => [r.status, r._count]));
  },

  async create(data: Omit<Jamaah, "id" | "createdAt" | "updatedAt" | "dokumen">) {
    const row = await prisma.jamaah.create({
      data: {
        registrationId: data.registrationId,
        groupId: data.groupId,
        nomorPeserta: data.nomorPeserta,
        namaLengkap: data.namaLengkap,
        namaAyah: data.namaAyah,
        jenisKelamin: data.jenisKelamin,
        tempatLahir: data.tempatLahir,
        tanggalLahir: new Date(data.tanggalLahir),
        nik: data.nik,
        nomorPaspor: data.nomorPaspor,
        masaBerlakuPaspor: new Date(data.masaBerlakuPaspor),
        nomorTelepon: data.nomorTelepon,
        email: data.email,
        alamat: data.alamat,
        provinsi: data.provinsi,
        kota: data.kota,
        kecamatan: data.kecamatan,
        kelurahan: data.kelurahan,
        tandaTanganDigital: data.tandaTanganDigital,
        syaratDisetujui: data.syaratDisetujui,
        status: data.status,
        hotelMekkah: data.hotelMekkah,
        hotelMadinah: data.hotelMadinah,
      },
      include: { dokumen: true },
    });
    return mapJamaah(row);
  },

  async update(id: string, data: Partial<Jamaah>) {
    const updateData: any = {};
    if (data.namaLengkap !== undefined) updateData.namaLengkap = data.namaLengkap;
    if (data.namaAyah !== undefined) updateData.namaAyah = data.namaAyah;
    if (data.jenisKelamin !== undefined) updateData.jenisKelamin = data.jenisKelamin;
    if (data.tempatLahir !== undefined) updateData.tempatLahir = data.tempatLahir;
    if (data.tanggalLahir !== undefined) updateData.tanggalLahir = new Date(data.tanggalLahir);
    if (data.nik !== undefined) updateData.nik = data.nik;
    if (data.nomorPaspor !== undefined) updateData.nomorPaspor = data.nomorPaspor;
    if (data.masaBerlakuPaspor !== undefined) updateData.masaBerlakuPaspor = new Date(data.masaBerlakuPaspor);
    if (data.nomorTelepon !== undefined) updateData.nomorTelepon = data.nomorTelepon;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.alamat !== undefined) updateData.alamat = data.alamat;
    if (data.provinsi !== undefined) updateData.provinsi = data.provinsi;
    if (data.kota !== undefined) updateData.kota = data.kota;
    if (data.kecamatan !== undefined) updateData.kecamatan = data.kecamatan;
    if (data.kelurahan !== undefined) updateData.kelurahan = data.kelurahan;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.hotelMekkah !== undefined) updateData.hotelMekkah = data.hotelMekkah;
    if (data.hotelMadinah !== undefined) updateData.hotelMadinah = data.hotelMadinah;

    const row = await prisma.jamaah.update({ where: { id }, data: updateData, include: { dokumen: true } });
    return mapJamaah(row);
  },

  async getDocumentCompletionMatrix(groupId: string) {
    const rows = await prisma.jamaah.findMany({
      where: { groupId },
      include: { dokumen: true },
    });
    return rows.map((j) => ({
      jamaahId: j.id,
      namaLengkap: j.namaLengkap,
      dokumen: j.dokumen.map(dokumenRepo.mapDokumen),
    }));
  },

  async getReadiness(jamaahId: string): Promise<JamaahReadinessResult> {
    const jamaah = await prisma.jamaah.findUnique({ where: { id: jamaahId }, include: { dokumen: true } });
    if (!jamaah) throw new Error("Jamaah not found");

    const checks: ReadinessCheckItem[] = [
      { key: "paspor", label: "Paspor", status: docStatus(jamaah.dokumen, "paspor"), detail: "Dokumen wajib" },
      { key: "pas_foto", label: "Pas Foto", status: docStatus(jamaah.dokumen, "pas_foto"), detail: "Dokumen wajib" },
      { key: "vaksin", label: "Vaksin", status: docStatus(jamaah.dokumen, "vaksin"), detail: "Dokumen wajib" },
      { key: "ktp", label: "KTP", status: docStatus(jamaah.dokumen, "ktp"), detail: "Dokumen wajib" },
      { key: "pembayaran", label: "Pembayaran", status: jamaah.status === "lunas" ? "passed" : jamaah.status === "batal" ? "failed" : "warning" },
    ];

    const passed = checks.filter((c) => c.status === "passed").length;
    const total = checks.length;
    const score = Math.round((passed / total) * 100);

    let level: ReadinessLevel = "READY";
    if (score < 50) level = "BLOCKED";
    else if (score < 75) level = "INCOMPLETE";
    else if (score < 100) level = "WARNING";

    return { level, checks, passed, total, score };
  },
};

function docStatus(docs: any[], jenis: string): "passed" | "warning" | "failed" | "skipped" {
  const doc = docs.find((d) => d.jenis === jenis);
  if (!doc) return "failed";
  if (doc.status === "verified" || doc.status === "lengkap") return "passed";
  if (doc.status === "rejected") return "failed";
  return "warning";
}
