import { airlineRepo } from "../repositories/master/airline.repository";

export const masterDataService = {
  // Airline
  async getAirlines(params?: { isActive?: boolean; limit?: number; offset?: number; search?: string; sort?: string; order?: "asc" | "desc" }) {
    return airlineRepo.findAll(params);
  },
  async getAirlineById(id: string) {
    return airlineRepo.findById(id);
  },
  async createAirline(data: { code: string; name: string; isActive?: boolean }) {
    const existingCode = await airlineRepo.findByCode(data.code);
    if (existingCode) {
      throw new Error("DUPLICATE_CODE");
    }
    const existingName = await airlineRepo.findByName(data.name);
    if (existingName) {
      throw new Error("DUPLICATE_NAME");
    }
    return airlineRepo.create({
      ...data,
      isActive: data.isActive ?? true,
    });
  },
  async updateAirline(id: string, data: { code?: string; name?: string; isActive?: boolean }) {
    if (data.code) {
      const existingCode = await airlineRepo.findByCode(data.code);
      if (existingCode && existingCode.id !== id) {
        throw new Error("DUPLICATE_CODE");
      }
    }
    if (data.name) {
      const existingName = await airlineRepo.findByName(data.name);
      if (existingName && existingName.id !== id) {
        throw new Error("DUPLICATE_NAME");
      }
    }
    return airlineRepo.update(id, data);
  },
  async deleteAirline(id: string) {
    const row = await airlineRepo.findById(id);
    if (!row) throw new Error("NOT_FOUND");
    
    // Check relations - using prisma directly is forbidden, but we can do a try/catch on hard delete,
    // or we can implement the relation check.
    // The policy says: "Jika memiliki relasi -> Soft Delete". 
    try {
      return await airlineRepo.delete(id);
    } catch (e: any) {
      // Prisma P2003 Foreign Key constraint failed
      if (e?.code === "P2003") {
        return await airlineRepo.update(id, { isActive: false });
      }
      throw e;
    }
  },
};

