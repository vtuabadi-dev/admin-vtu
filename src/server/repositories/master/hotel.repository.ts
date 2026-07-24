import { prisma } from "@/server/db/client";

export interface MasterHotel {
  id: string;
  code: string;
  name: string;
  cityId: string;
  starRating?: number | null;
  jarakText?: string | null;
  videoJarakUrl?: string | null;
  videoJarakDriveId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapMasterHotel(row: any): MasterHotel {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    cityId: row.cityId,
    city: row.city ? { id: row.city.id, name: row.city.name, code: row.city.code } : undefined,
    starRating: row.starRating,
    jarakText: row.jarakText,
    videoJarakUrl: row.videoJarakUrl,
    videoJarakDriveId: row.videoJarakDriveId,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const hotelRepo = {
  async findAll(params?: { isActive?: boolean; limit?: number; offset?: number; search?: string; sort?: string; order?: "asc" | "desc"; cityId?: string }) {
    const where: any = {};
    if (params?.isActive !== undefined) where.isActive = params.isActive;
    if (params?.cityId !== undefined) where.cityId = params.cityId;
    
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
      prisma.masterHotel.findMany({
        where,
        take: params?.limit ?? 100,
        skip: params?.offset ?? 0,
        orderBy,
        include: { city: true },
      }),
      prisma.masterHotel.count({ where }),
    ]);
    return { data: rows.map(mapMasterHotel), total };
  },

  async findById(id: string) {
    const row = await prisma.masterHotel.findUnique({
      where: { id },
    });
    return row ? mapMasterHotel(row) : null;
  },

  async findByCode(code: string) {
    const row = await prisma.masterHotel.findFirst({
      where: { code: { equals: code, mode: "insensitive" } },
    });
    return row ? mapMasterHotel(row) : null;
  },

  async findByName(name: string) {
    const row = await prisma.masterHotel.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    return row ? mapMasterHotel(row) : null;
  },

  async create(data: Omit<MasterHotel, "id" | "createdAt" | "updatedAt">) {
    const row = await prisma.masterHotel.create({
      data: {
        code: data.code,
        name: data.name,
        cityId: data.cityId,
        starRating: data.starRating,
        jarakText: data.jarakText,
        videoJarakUrl: data.videoJarakUrl,
        videoJarakDriveId: data.videoJarakDriveId,
        isActive: data.isActive,
      },
    });
    return mapMasterHotel(row);
  },

  async update(id: string, data: Partial<MasterHotel>) {
    const updateData: any = {};
    if (data.code !== undefined) updateData.code = data.code;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.cityId !== undefined) updateData.cityId = data.cityId;
    if (data.starRating !== undefined) updateData.starRating = data.starRating;
    if (data.jarakText !== undefined) updateData.jarakText = data.jarakText;
    if (data.videoJarakUrl !== undefined) updateData.videoJarakUrl = data.videoJarakUrl;
    if (data.videoJarakDriveId !== undefined) updateData.videoJarakDriveId = data.videoJarakDriveId;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const row = await prisma.masterHotel.update({
      where: { id },
      data: updateData,
    });
    return mapMasterHotel(row);
  },

  async delete(id: string) {
    await prisma.masterHotel.delete({
      where: { id },
    });
    return true;
  },
};
