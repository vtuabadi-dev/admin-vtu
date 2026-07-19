import { prisma } from "@/server/db/client";

export interface MasterCity {
  id: string;
  code: string;
  name: string;
  country: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapMasterCity(row: any): MasterCity {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    country: row.country,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const cityRepo = {
  async findAll(params?: { isActive?: boolean; limit?: number; offset?: number; search?: string; sort?: string; order?: "asc" | "desc" }) {
    const where: any = {};
    if (params?.isActive !== undefined) where.isActive = params.isActive;
    
    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { code: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const orderBy: any = {};
    if (params?.sort && ["name", "code", "createdAt"].includes(params.sort)) {
      orderBy[params.sort] = params?.order || "asc";
    } else {
      orderBy.name = "asc";
    }

    const [rows, total] = await Promise.all([
      prisma.masterCity.findMany({
        where,
        take: params?.limit ?? 100,
        skip: params?.offset ?? 0,
        orderBy,
      }),
      prisma.masterCity.count({ where }),
    ]);
    return { data: rows.map(mapMasterCity), total };
  },

  async findById(id: string) {
    const row = await prisma.masterCity.findUnique({
      where: { id },
    });
    return row ? mapMasterCity(row) : null;
  },

  async findByCode(code: string) {
    const row = await prisma.masterCity.findFirst({
      where: { code: { equals: code, mode: "insensitive" } },
    });
    return row ? mapMasterCity(row) : null;
  },

  async findByName(name: string) {
    const row = await prisma.masterCity.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    return row ? mapMasterCity(row) : null;
  },

  async create(data: Omit<MasterCity, "id" | "createdAt" | "updatedAt">) {
    const row = await prisma.masterCity.create({
      data: {
        code: data.code,
        name: data.name,
        country: data.country,
        isActive: data.isActive,
      },
    });
    return mapMasterCity(row);
  },

  async update(id: string, data: Partial<MasterCity>) {
    const updateData: any = {};
    if (data.code !== undefined) updateData.code = data.code;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const row = await prisma.masterCity.update({
      where: { id },
      data: updateData,
    });
    return mapMasterCity(row);
  },

  async delete(id: string) {
    await prisma.masterCity.delete({
      where: { id },
    });
    return true;
  },
};
