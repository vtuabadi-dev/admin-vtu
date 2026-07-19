import { prisma } from "@/server/db/client";

export interface MasterPackageType {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapMasterPackageType(row: any): MasterPackageType {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const packageTypeRepo = {
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
      prisma.masterPackageType.findMany({
        where,
        take: params?.limit ?? 100,
        skip: params?.offset ?? 0,
        orderBy,
      }),
      prisma.masterPackageType.count({ where }),
    ]);
    return { data: rows.map(mapMasterPackageType), total };
  },

  async findById(id: string) {
    const row = await prisma.masterPackageType.findUnique({
      where: { id },
    });
    return row ? mapMasterPackageType(row) : null;
  },

  async findByCode(code: string) {
    const row = await prisma.masterPackageType.findFirst({
      where: { code: { equals: code, mode: "insensitive" } },
    });
    return row ? mapMasterPackageType(row) : null;
  },

  async findByName(name: string) {
    const row = await prisma.masterPackageType.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    return row ? mapMasterPackageType(row) : null;
  },

  async create(data: Omit<MasterPackageType, "id" | "createdAt" | "updatedAt">) {
    const row = await prisma.masterPackageType.create({
      data: {
        code: data.code,
        name: data.name,
        isActive: data.isActive,
      },
    });
    return mapMasterPackageType(row);
  },

  async update(id: string, data: Partial<MasterPackageType>) {
    const updateData: any = {};
    if (data.code !== undefined) updateData.code = data.code;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const row = await prisma.masterPackageType.update({
      where: { id },
      data: updateData,
    });
    return mapMasterPackageType(row);
  },

  async delete(id: string) {
    await prisma.masterPackageType.delete({
      where: { id },
    });
    return true;
  },
};
