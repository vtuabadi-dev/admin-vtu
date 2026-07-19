import { prisma } from "@/server/db/client";

export interface MasterHotelCity {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapMasterHotelCity(row: any): MasterHotelCity {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const hotelCityRepo = {
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
      prisma.masterHotelCity.findMany({
        where,
        take: params?.limit ?? 100,
        skip: params?.offset ?? 0,
        orderBy,
      }),
      prisma.masterHotelCity.count({ where }),
    ]);
    return { data: rows.map(mapMasterHotelCity), total };
  },

  async findById(id: string) {
    const row = await prisma.masterHotelCity.findUnique({
      where: { id },
    });
    return row ? mapMasterHotelCity(row) : null;
  },

  async findByCode(code: string) {
    const row = await prisma.masterHotelCity.findFirst({
      where: { code: { equals: code, mode: "insensitive" } },
    });
    return row ? mapMasterHotelCity(row) : null;
  },

  async findByName(name: string) {
    const row = await prisma.masterHotelCity.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    return row ? mapMasterHotelCity(row) : null;
  },

  async create(data: Omit<MasterHotelCity, "id" | "createdAt" | "updatedAt">) {
    const row = await prisma.masterHotelCity.create({
      data: {
        code: data.code,
        name: data.name,
        isActive: data.isActive,
      },
    });
    return mapMasterHotelCity(row);
  },

  async update(id: string, data: Partial<MasterHotelCity>) {
    const updateData: any = {};
    if (data.code !== undefined) updateData.code = data.code;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const row = await prisma.masterHotelCity.update({
      where: { id },
      data: updateData,
    });
    return mapMasterHotelCity(row);
  },

  async delete(id: string) {
    const row = await prisma.masterHotelCity.delete({
      where: { id },
    });
    return mapMasterHotelCity(row);
  },
};
