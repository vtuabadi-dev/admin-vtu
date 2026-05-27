import type { StatusPembayaran } from "@/shared/types";

export function deriveGroupPaymentStatus(
  totalTagihan: number,
  totalPembayaran: number,
  sisaPembayaran: number,
  hasOverdueInvoice = false,
): StatusPembayaran {
  if (hasOverdueInvoice) return "overdue";
  if (sisaPembayaran <= 0) return "lunas";
  if (totalPembayaran === 0) return "draft";
  const paidRatio = totalPembayaran / totalTagihan;
  if (paidRatio < 0.15) return "dp";
  if (sisaPembayaran / totalTagihan <= 0.1) return "hampir_lunas";
  return "cicilan";
}
