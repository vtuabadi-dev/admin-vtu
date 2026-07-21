import { airlineRepo } from "../repositories/master/airline.repository";
import { hotelRepo } from "../repositories/master/hotel.repository";
import { cityRepo } from "../repositories/master/city.repository";
import { packageTypeRepo } from "../repositories/master/package-type.repository";
import { hotelCityRepo } from "../repositories/master/hotel-city.repository";
import { routeRepo } from "../repositories/master/route.repository";

export const masterDataService = {
  // Routes
  async getRoutes(params?: { isActive?: boolean; limit?: number; offset?: number; search?: string }) {
    return routeRepo.findAll(params);
  },
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
    
    try {
      return await airlineRepo.delete(id);
    } catch (e: any) {
      if (e?.code === "P2003" || e?.code === "P2014") {
        throw new Error("REFERENCE_CONSTRAINT");
      }
      throw e;
    }
  },

  // Hotels
  async getHotels(params?: { isActive?: boolean; limit?: number; offset?: number; search?: string; sort?: string; order?: "asc" | "desc"; cityId?: string }) {
    return hotelRepo.findAll(params);
  },
  async getHotelById(id: string) {
    return hotelRepo.findById(id);
  },
  async createHotel(data: { code: string; name: string; cityId: string; starRating?: number; isActive?: boolean }) {
    const existingCode = await hotelRepo.findByCode(data.code);
    if (existingCode) throw new Error("DUPLICATE_CODE");
    const existingName = await hotelRepo.findByName(data.name);
    if (existingName) throw new Error("DUPLICATE_NAME");
    return hotelRepo.create({
      ...data,
      starRating: data.starRating ?? null,
      isActive: data.isActive ?? true,
    });
  },
  async updateHotel(id: string, data: { code?: string; name?: string; cityId?: string; starRating?: number; isActive?: boolean }) {
    if (data.code) {
      const existing = await hotelRepo.findByCode(data.code);
      if (existing && existing.id !== id) throw new Error("DUPLICATE_CODE");
    }
    if (data.name) {
      const existing = await hotelRepo.findByName(data.name);
      if (existing && existing.id !== id) throw new Error("DUPLICATE_NAME");
    }
    return hotelRepo.update(id, data);
  },
  async deleteHotel(id: string) {
    const row = await hotelRepo.findById(id);
    if (!row) throw new Error("NOT_FOUND");
    try {
      return await hotelRepo.delete(id);
    } catch (e: any) {
      if (e?.code === "P2003" || e?.code === "P2014") {
        throw new Error("REFERENCE_CONSTRAINT");
      }
      throw e;
    }
  },

  // Cities
  async getCities(params?: { isActive?: boolean; limit?: number; offset?: number; search?: string; sort?: string; order?: "asc" | "desc" }) {
    return cityRepo.findAll(params);
  },
  async getCityById(id: string) {
    return cityRepo.findById(id);
  },
  async createCity(data: { code: string; name: string; country: string; isActive?: boolean }) {
    const existingCode = await cityRepo.findByCode(data.code);
    if (existingCode) throw new Error("DUPLICATE_CODE");
    const existingName = await cityRepo.findByName(data.name);
    if (existingName) throw new Error("DUPLICATE_NAME");
    return cityRepo.create({
      ...data,
      isActive: data.isActive ?? true,
    });
  },
  async updateCity(id: string, data: { code?: string; name?: string; country?: string; isActive?: boolean }) {
    if (data.code) {
      const existing = await cityRepo.findByCode(data.code);
      if (existing && existing.id !== id) throw new Error("DUPLICATE_CODE");
    }
    if (data.name) {
      const existing = await cityRepo.findByName(data.name);
      if (existing && existing.id !== id) throw new Error("DUPLICATE_NAME");
    }
    return cityRepo.update(id, data);
  },
  async deleteCity(id: string) {
    const row = await cityRepo.findById(id);
    if (!row) throw new Error("NOT_FOUND");
    try {
      return await cityRepo.delete(id);
    } catch (e: any) {
      if (e?.code === "P2003" || e?.code === "P2014") {
        throw new Error("REFERENCE_CONSTRAINT");
      }
      throw e;
    }
  },

  // Package Types
  async getPackageTypes(params?: { isActive?: boolean; limit?: number; offset?: number; search?: string; sort?: string; order?: "asc" | "desc" }) {
    return packageTypeRepo.findAll(params);
  },
  async getPackageTypeById(id: string) {
    return packageTypeRepo.findById(id);
  },
  async createPackageType(data: { code: string; name: string; isActive?: boolean }) {
    const existingCode = await packageTypeRepo.findByCode(data.code);
    if (existingCode) throw new Error("DUPLICATE_CODE");
    const existingName = await packageTypeRepo.findByName(data.name);
    if (existingName) throw new Error("DUPLICATE_NAME");
    return packageTypeRepo.create({
      ...data,
      isActive: data.isActive ?? true,
    });
  },
  async updatePackageType(id: string, data: { code?: string; name?: string; isActive?: boolean }) {
    if (data.code) {
      const existing = await packageTypeRepo.findByCode(data.code);
      if (existing && existing.id !== id) throw new Error("DUPLICATE_CODE");
    }
    if (data.name) {
      const existing = await packageTypeRepo.findByName(data.name);
      if (existing && existing.id !== id) throw new Error("DUPLICATE_NAME");
    }
    return packageTypeRepo.update(id, data);
  },
  async deletePackageType(id: string) {
    const row = await packageTypeRepo.findById(id);
    if (!row) throw new Error("NOT_FOUND");
    try {
      return await packageTypeRepo.delete(id);
    } catch (e: any) {
      if (e?.code === "P2003" || e?.code === "P2014") {
        throw new Error("REFERENCE_CONSTRAINT");
      }
      throw e;
    }
  },

  // Hotel Cities
  async getHotelCities(params?: { isActive?: boolean; limit?: number; offset?: number; search?: string; sort?: string; order?: "asc" | "desc" }) {
    return hotelCityRepo.findAll(params);
  },
  async getHotelCityById(id: string) {
    return hotelCityRepo.findById(id);
  },
  async createHotelCity(data: { code: string; name: string; isActive?: boolean }) {
    const existingCode = await hotelCityRepo.findByCode(data.code);
    if (existingCode) throw new Error("DUPLICATE_CODE");
    const existingName = await hotelCityRepo.findByName(data.name);
    if (existingName) throw new Error("DUPLICATE_NAME");
    return hotelCityRepo.create({
      ...data,
      isActive: data.isActive ?? true,
    });
  },
  async updateHotelCity(id: string, data: { code?: string; name?: string; isActive?: boolean }) {
    if (data.code) {
      const existing = await hotelCityRepo.findByCode(data.code);
      if (existing && existing.id !== id) throw new Error("DUPLICATE_CODE");
    }
    if (data.name) {
      const existing = await hotelCityRepo.findByName(data.name);
      if (existing && existing.id !== id) throw new Error("DUPLICATE_NAME");
    }
    return hotelCityRepo.update(id, data);
  },
  async deleteHotelCity(id: string) {
    const row = await hotelCityRepo.findById(id);
    if (!row) throw new Error("NOT_FOUND");
    try {
      return await hotelCityRepo.delete(id);
    } catch (e: any) {
      if (e?.code === "P2003" || e?.code === "P2014") {
        throw new Error("REFERENCE_CONSTRAINT");
      }
      throw e;
    }
  },
};


