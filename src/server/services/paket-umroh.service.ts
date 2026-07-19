import { paketUmrohRepo } from "@/server/repositories/paket-umroh.repository";
import { keberangkatanRepo } from "@/server/repositories/keberangkatan.repository";
import type { CreatePackageInput, UpdatePackageInput } from "@/shared/types";

export class BusinessValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessValidationError";
  }
}

export const paketUmrohService = {
  /**
   * BR-001: Package dapat dibuat
   * BR-003: Nama Package wajib valid
   * BR-004: Base Price harus lebih besar dari nol
   */
  async create(data: CreatePackageInput) {
    if (!data.namaPaket || data.namaPaket.trim() === "") {
      throw new BusinessValidationError("Nama Paket tidak boleh kosong.");
    }
    if (data.hargaBase <= 0) {
      throw new BusinessValidationError("Base Price harus lebih besar dari 0.");
    }
    if (data.durasiHari <= 0) {
      throw new BusinessValidationError("Durasi Hari harus lebih besar dari 0.");
    }
    return paketUmrohRepo.create(data);
  },

  /**
   * Retrieves all packages
   */
  async findAll() {
    return paketUmrohRepo.findAll();
  },

  /**
   * Retrieves a single package by ID
   */
  async findById(id: string) {
    return paketUmrohRepo.findById(id);
  },

  /**
   * BR-005: Update Package tidak boleh merusak data existing
   * Nama dan harga dapat diupdate jika diperlukan.
   */
  async update(id: string, data: UpdatePackageInput) {
    const existing = await paketUmrohRepo.findById(id);
    if (!existing) {
      throw new BusinessValidationError("Paket Umroh tidak ditemukan.");
    }

    if (data.namaPaket !== undefined && data.namaPaket.trim() === "") {
      throw new BusinessValidationError("Nama Paket tidak boleh kosong.");
    }
    if (data.hargaBase !== undefined && data.hargaBase <= 0) {
      throw new BusinessValidationError("Base Price harus lebih besar dari 0.");
    }
    if (data.durasiHari !== undefined && data.durasiHari <= 0) {
      throw new BusinessValidationError("Durasi Hari harus lebih besar dari 0.");
    }

    return paketUmrohRepo.update(id, data);
  },

  /**
   * BR-002: Package tidak boleh dihapus apabila sudah memiliki Keberangkatan
   */
  async delete(id: string) {
    const existing = await paketUmrohRepo.findById(id);
    if (!existing) {
      throw new BusinessValidationError("Paket Umroh tidak ditemukan.");
    }

    const count = await keberangkatanRepo.countByPaketId(id);
    if (count > 0) {
      throw new BusinessValidationError(
        `Tidak dapat menghapus Paket Umroh. Sudah terdapat ${count} Keberangkatan yang terhubung.`
      );
    }

    return paketUmrohRepo.delete(id);
  },
};
