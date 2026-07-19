"use server";

import { revalidatePath } from "next/cache";
import { PaketUmrohService } from "./services/paket.service";
import { PaketUmrohConfiguration } from "./types";

const service = new PaketUmrohService();

export async function generatePaketAction(data: PaketUmrohConfiguration) {
  try {
    const userId = "admin-sys"; 
    const result = await service.generatePaket(data, userId);
    revalidatePath("/admin/paket-umroh");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPaketListAction() {
  try {
    const list = await service.getList();
    return { success: true, data: list };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPaketDetailAction(id: string) {
  try {
    const detail = await service.getDetail(id);
    return { success: true, data: detail };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
