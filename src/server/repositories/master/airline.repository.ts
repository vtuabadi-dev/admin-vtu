import { prisma } from "@/server/db/client";

export interface MasterAirline {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapMasterAirline(row: any): MasterAirline {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const airlineRepo = {
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
      prisma.masterAirline.findMany({
        where,
        take: params?.limit ?? 20,
        skip: params?.offset ?? 0,
        orderBy,
      }),
      prisma.masterAirline.count({ where }),
    ]);
    return { data: rows.map(mapMasterAirline), total };
  },

  async findById(id: string) {
    const row = await prisma.masterAirline.findUnique({
      where: { id },
    });
    return row ? mapMasterAirline(row) : null;
  },

  async findByCode(code: string) {
    const row = await prisma.masterAirline.findFirst({
      where: { code: { equals: code, mode: "insensitive" } },
    });
    return row ? mapMasterAirline(row) : null;
  },

  async findByName(name: string) {
    const row = await prisma.masterAirline.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    return row ? mapMasterAirline(row) : null;
  },

  async create(data: Omit<MasterAirline, "id" | "createdAt" | "updatedAt">) {
    const row = await prisma.masterAirline.create({
      data: {
        code: data.code,
        name: data.name,
        isActive: data.isActive,
      },
    });
    return mapMasterAirline(row);
  },

  async update(id: string, data: Partial<MasterAirline>) {
    const updateData: any = {};
    if (data.code !== undefined) updateData.code = data.code;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const row = await prisma.masterAirline.update({
      where: { id },
      data: updateData,
    });
    return mapMasterAirline(row);
  },

  async delete(id: string) {
    await prisma.masterAirline.delete({
      where: { id },
    });
    return true;
  },
};
