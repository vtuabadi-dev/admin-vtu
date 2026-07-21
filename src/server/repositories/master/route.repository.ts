import { prisma } from "@/server/db/client";

export interface MasterRoute {
  id: string;
  ruteIn: string;
  ruteOut: string;
  kode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapMasterRoute(row: any): MasterRoute {
  return {
    id: row.id,
    ruteIn: row.ruteIn,
    ruteOut: row.ruteOut,
    kode: row.kode,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const routeRepo = {
  async findAll(params?: { isActive?: boolean; limit?: number; offset?: number; search?: string }) {
    const where: any = {};
    if (params?.isActive !== undefined) where.isActive = params.isActive;

    if (params?.search) {
      where.OR = [
        { ruteIn: { contains: params.search, mode: "insensitive" } },
        { ruteOut: { contains: params.search, mode: "insensitive" } },
        { kode: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.masterRoute.findMany({
        where,
        take: params?.limit ?? 100,
        skip: params?.offset ?? 0,
        orderBy: { createdAt: "desc" },
      }),
      prisma.masterRoute.count({ where }),
    ]);
    return { data: rows.map(mapMasterRoute), total };
  },

  async findById(id: string) {
    const row = await prisma.masterRoute.findUnique({
      where: { id },
    });
    return row ? mapMasterRoute(row) : null;
  },

  async create(data: { ruteIn: string; ruteOut: string; kode?: string; isActive?: boolean }) {
    const kode = data.kode || `${data.ruteIn}-${data.ruteOut}`.toUpperCase();
    const row = await prisma.masterRoute.create({
      data: {
        ruteIn: data.ruteIn,
        ruteOut: data.ruteOut,
        kode,
        isActive: data.isActive ?? true,
      },
    });
    return mapMasterRoute(row);
  },

  async update(id: string, data: Partial<MasterRoute>) {
    const updateData: any = {};
    if (data.ruteIn !== undefined) updateData.ruteIn = data.ruteIn;
    if (data.ruteOut !== undefined) updateData.ruteOut = data.ruteOut;
    if (data.kode !== undefined) updateData.kode = data.kode;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const row = await prisma.masterRoute.update({
      where: { id },
      data: updateData,
    });
    return mapMasterRoute(row);
  },

  async delete(id: string) {
    await prisma.masterRoute.delete({
      where: { id },
    });
    return true;
  },
};
