import { prisma } from "@/server/db/client";
import { PaketUmroh, Prisma } from "@prisma/client";

export class PaketUmrohRepository {
  async create(data: Prisma.PaketUmrohCreateInput): Promise<PaketUmroh> {
    return prisma.paketUmroh.create({ data });
  }

  async findById(id: string): Promise<PaketUmroh | null> {
    return prisma.paketUmroh.findUnique({ where: { id } });
  }

  async findAll(): Promise<PaketUmroh[]> {
    return prisma.paketUmroh.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async update(
    id: string,
    data: Prisma.PaketUmrohUpdateInput
  ): Promise<PaketUmroh> {
    return prisma.paketUmroh.update({
      where: { id },
      data,
    });
  }
}
