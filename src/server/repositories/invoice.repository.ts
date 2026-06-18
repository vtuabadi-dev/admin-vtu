import { prisma } from "@/server/db/client";
import type { Invoice, InvoiceItem, StatusInvoice, StatusItemInvoice } from "@/shared/types";

function mapInvoice(row: any): Invoice {
  return {
    id: row.id,
    nomorInvoice: row.nomorInvoice,
    groupId: row.groupId,
    jamaahId: row.jamaahId ?? undefined,
    tipe: row.tipe,
    jumlah: row.jumlah,
    sisaTagihan: row.sisaTagihan,
    status: row.status as StatusInvoice,
    jatuhTempo: row.jatuhTempo.toISOString(),
    items: (row.items ?? []).map(mapInvoiceItem),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapInvoiceItem(item: any): InvoiceItem {
  return {
    id: item.id,
    invoiceId: item.invoiceId,
    kategori: item.kategori,
    deskripsi: item.deskripsi,
    qty: item.qty,
    hargaSatuan: item.hargaSatuan,
    jumlah: item.jumlah,
    status: item.status as StatusItemInvoice,
    cancelledAt: item.cancelledAt?.toISOString(),
    cancelledBy: item.cancelledBy ?? undefined,
    cancellationReason: item.cancellationReason ?? undefined,
  };
}

// ────────────────────────────────────────────────────────────
// Queries
// ────────────────────────────────────────────────────────────

export const invoiceRepo = {
  async findAll(params?: { groupId?: string; status?: string; limit?: number; offset?: number }) {
    const where: any = {};
    if (params?.groupId) where.groupId = params.groupId;
    if (params?.status) where.status = params.status;

    const [rows, total] = await Promise.all([
      prisma.invoice.findMany({ where, include: { items: true }, take: params?.limit, skip: params?.offset, orderBy: { createdAt: "desc" } }),
      prisma.invoice.count({ where }),
    ]);
    return { data: rows.map(mapInvoice), total };
  },

  async findById(id: string) {
    const row = await prisma.invoice.findUnique({ where: { id }, include: { items: true } });
    return row ? mapInvoice(row) : null;
  },

  async findByGroup(groupId: string) {
    const rows = await prisma.invoice.findMany({ where: { groupId }, include: { items: true }, orderBy: { createdAt: "desc" } });
    return rows.map(mapInvoice);
  },

  async create(data: Omit<Invoice, "id" | "createdAt" | "updatedAt" | "items"> & { items: Omit<InvoiceItem, "id" | "invoiceId">[] }) {
    const row = await prisma.invoice.create({
      data: {
        nomorInvoice: data.nomorInvoice,
        groupId: data.groupId,
        jamaahId: (data as any).jamaahId ?? null,
        tipe: data.tipe,
        jumlah: data.jumlah,
        sisaTagihan: data.sisaTagihan,
        status: data.status,
        jatuhTempo: new Date(data.jatuhTempo),
        items: {
          create: data.items.map((it: any) => ({
            kategori: it.kategori,
            deskripsi: it.deskripsi,
            qty: it.qty,
            hargaSatuan: it.hargaSatuan,
            jumlah: it.qty * it.hargaSatuan,
            status: it.status ?? "active",
          })),
        },
      },
      include: { items: true },
    });
    return mapInvoice(row);
  },

  async updateStatus(id: string, status: StatusInvoice) {
    const row = await prisma.invoice.update({ where: { id }, data: { status }, include: { items: true } });
    return mapInvoice(row);
  },

  async recalculate(id: string) {
    const invoice = await prisma.invoice.findUnique({ where: { id }, include: { items: true } });
    if (!invoice) throw new Error("Invoice not found");

    const activeItems = invoice.items.filter((it: any) => it.status === "active");
    const jumlah = activeItems.reduce((sum: number, it: any) => sum + it.jumlah, 0);
    const pembayaran = await prisma.pembayaran.aggregate({ where: { invoiceId: id, status: "verified" }, _sum: { jumlah: true } });
    const totalPembayaran = pembayaran._sum.jumlah ?? 0;
    const sisaTagihan = Math.max(0, jumlah - totalPembayaran);

    const row = await prisma.invoice.update({ where: { id }, data: { jumlah, sisaTagihan }, include: { items: true } });
    return mapInvoice(row);
  },

  async addItem(invoiceId: string, item: Omit<InvoiceItem, "id" | "invoiceId">) {
    await prisma.invoiceItem.create({
      data: {
        invoiceId,
        kategori: item.kategori,
        deskripsi: item.deskripsi,
        qty: item.qty,
        hargaSatuan: item.hargaSatuan,
        jumlah: item.qty * item.hargaSatuan,
        status: item.status ?? "active",
      },
    });
    return invoiceRepo.recalculate(invoiceId);
  },

  async cancelItem(itemId: string, cancelledBy?: string, reason?: string) {
    await prisma.invoiceItem.update({
      where: { id: itemId },
      data: { status: "cancelled", cancelledAt: new Date(), cancelledBy: cancelledBy ?? null, cancellationReason: reason ?? null },
    });
    const item = await prisma.invoiceItem.findUnique({ where: { id: itemId } });
    if (!item) throw new Error("Item not found");
    return invoiceRepo.recalculate(item.invoiceId);
  },
};
