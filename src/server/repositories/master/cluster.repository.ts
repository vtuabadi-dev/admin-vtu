import { prisma } from "@/server/db/client";

export interface MasterCluster {
  id: string;
  kode?: string | null;
  nama: string;
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapMasterCluster(row: any): MasterCluster {
  return {
    id: row.id,
    kode: row.kode ?? null,
    nama: row.nama,
    status: row.status ?? "Aktif",
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const clusterRepo = {
  async findAll(params?: { isActive?: boolean; limit?: number; offset?: number; search?: string }) {
    const where: any = {};
    if (params?.isActive !== undefined) where.isActive = params.isActive;

    if (params?.search) {
      where.OR = [
        { nama: { contains: params.search, mode: "insensitive" } },
        { kode: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.masterCluster.findMany({
        where,
        take: params?.limit ?? 100,
        skip: params?.offset ?? 0,
        orderBy: { createdAt: "desc" },
      }),
      prisma.masterCluster.count({ where }),
    ]);
    return { data: rows.map(mapMasterCluster), total };
  },

  async findById(id: string) {
    const row = await prisma.masterCluster.findUnique({
      where: { id },
    });
    return row ? mapMasterCluster(row) : null;
  },

  async create(data: { nama: string; kode?: string; status?: string; isActive?: boolean }) {
    const row = await prisma.masterCluster.create({
      data: {
        nama: data.nama,
        kode: data.kode || data.nama.toUpperCase().replace(/\s+/g, "_"),
        status: data.status || "Aktif",
        isActive: data.isActive ?? true,
      },
    });
    return mapMasterCluster(row);
  },

  async update(id: string, data: { nama?: string; kode?: string; status?: string; isActive?: boolean }) {
    const updateData: any = {};
    if (data.nama !== undefined) updateData.nama = data.nama;
    if (data.kode !== undefined) updateData.kode = data.kode;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const row = await prisma.masterCluster.update({
      where: { id },
      data: updateData,
    });
    return mapMasterCluster(row);
  },

  async delete(id: string) {
    await prisma.masterCluster.delete({
      where: { id },
    });
    return { success: true };
  },
};
