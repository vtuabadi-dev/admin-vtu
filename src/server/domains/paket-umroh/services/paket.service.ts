import { Prisma } from "@prisma/client";
import { PaketUmrohRepository } from "../repositories/paket.repository";
import { PaketUmrohConfiguration } from "../types";

export class PaketUmrohService {
  private repo: PaketUmrohRepository;

  constructor() {
    this.repo = new PaketUmrohRepository();
  }

  async generatePaket(
    data: PaketUmrohConfiguration,
    _userId: string
  ) {
    const payload: Prisma.PaketUmrohCreateInput = {
      namaPaket: data.namaPaket,
      deskripsi: data.deskripsi,
      hargaBase: data.hargaBase,
      durasiHari: data.durasiHari,
      hotelMekkahOptions: data.hotelMekkahOptions,
      hotelMadinahOptions: data.hotelMadinahOptions,
    };

    return this.repo.create(payload);
  }

  async updatePaket(id: string, data: Partial<PaketUmrohConfiguration>, _userId: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error("Paket tidak ditemukan");

    return this.repo.update(id, data);
  }

  async getList() {
    return this.repo.findAll();
  }

  async getDetail(id: string) {
    const detail = await this.repo.findById(id);
    if (!detail) throw new Error("Paket tidak ditemukan");
    return detail;
  }
}
