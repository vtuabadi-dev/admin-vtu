import { prisma } from "@/server/db/client";
import {
  detectRoomTypeFromName,
  resolveCanonicalGroupBilling,
  resolvePackageBillingConfig,
  resolveRoomUpgradeUnitPrice,
} from "@/shared/lib/billing-ssot";
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

  async syncGroupTotals(groupId: string) {
    const group = await prisma.registrationGroup.findUnique({
      where: { id: groupId },
      include: {
        keberangkatan: {
          include: { hotelMekkahMaster: true, hotelMadinahMaster: true },
        },
        anggota: true,
        registrationRequests: { orderBy: { createdAt: "desc" }, take: 1 },
        invoices: {
          where: { status: { not: "cancelled" } },
          include: { items: true },
          orderBy: { createdAt: "asc" },
        },
        pembayaran: true,
      },
    });
    if (!group) return null;

    const canonical = resolveCanonicalGroupBilling({
      group,
      activePackage: group.keberangkatan,
      members: group.anggota,
    });
    const netTotalTagihan = canonical.groupTotals.netTotalTagihan;
    const hasPaymentRecords = (group.pembayaran || []).length > 0;
    const verifiedPaid = (group.pembayaran || [])
      .filter((p: any) => p.status === "verified")
      .reduce((s: number, p: any) => s + Number(p.jumlah || 0), 0);
    const effectivePaid = hasPaymentRecords ? verifiedPaid : Number(group.totalPembayaran || 0);
    const sisaPembayaran = Math.max(0, netTotalTagihan - effectivePaid);

    await prisma.registrationGroup.update({
      where: { id: group.id },
      data: {
        totalTagihan: netTotalTagihan,
        totalPembayaran: effectivePaid,
        sisaPembayaran,
      },
    });
    return { totalTagihan: netTotalTagihan, totalPembayaran: effectivePaid, sisaPembayaran };
  },

  async ensureInitialGroupLedger(
    groupId: string,
    overrides?: { roomUpgrade?: string | null; targetKlaster?: string | null; paxCount?: number }
  ) {
    const group = await prisma.registrationGroup.findUnique({
      where: { id: groupId },
      include: {
        keberangkatan: {
          include: { hotelMekkahMaster: true, hotelMadinahMaster: true },
        },
        anggota: true,
        registrationRequests: { orderBy: { createdAt: "desc" }, take: 1 },
        invoices: {
          where: { status: { not: "cancelled" } },
          include: { items: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!group) return null;
    if ((group.invoices || []).length > 0) {
      return mapInvoice(group.invoices[0]);
    }

    const pax = Math.max(
      1,
      overrides?.paxCount || group.anggota?.length || group.jumlahAnggota || 1
    );
    const targetKlaster = overrides?.targetKlaster ?? group.registrationRequests?.[0]?.hotelUpgrade;
    const roomType = (overrides?.roomUpgrade ?? group.registrationRequests?.[0]?.roomUpgrade ?? "").trim();

    const pkgCfg = resolvePackageBillingConfig({
      activePackage: group.keberangkatan,
      group,
      member: group.anggota?.[0],
      targetKlaster,
    });

    const baseUnit = pkgCfg.hargaBase;
    const roomUpgradeUnit = resolveRoomUpgradeUnitPrice(pkgCfg, roomType);
    const totalTagihan = baseUnit * pax + roomUpgradeUnit * pax;

    let defaultJatuhTempo = new Date(Date.now() + 14 * 86400000);
    if (group.keberangkatan?.tanggalBerangkat) {
      const h40 = new Date(group.keberangkatan.tanggalBerangkat);
      h40.setDate(h40.getDate() - 40);
      if (h40.getTime() > Date.now() + 3 * 86400000) {
        defaultJatuhTempo = h40;
      }
    }

    const draftId = `BILL-${group.id}`;
    const draftNomor = `TAG-${group.kodeRegistrasi || group.id.slice(-6).toUpperCase()}`;

    await prisma.$transaction(async (tx) => {
      await tx.invoice.upsert({
        where: { id: draftId },
        create: {
          id: draftId,
          nomorInvoice: draftNomor,
          groupId: group.id,
          tipe: "pelunasan",
          jumlah: totalTagihan,
          sisaTagihan: Math.max(0, totalTagihan - group.totalPembayaran),
          status: group.totalPembayaran >= totalTagihan && totalTagihan > 0 ? "paid" : "unpaid",
          jatuhTempo: defaultJatuhTempo,
        },
        update: {
          jumlah: totalTagihan,
          sisaTagihan: Math.max(0, totalTagihan - group.totalPembayaran),
        },
      });

      const existingCount = await tx.invoiceItem.count({ where: { invoiceId: draftId } });
      if (existingCount === 0) {
        await tx.invoiceItem.create({
          data: {
            invoiceId: draftId,
            kategori: "utama",
            deskripsi: `${group.keberangkatan?.namaPaket || "Paket Umroh"} (${pax} Pax)`,
            qty: pax,
            hargaSatuan: baseUnit,
            jumlah: baseUnit * pax,
            status: "active",
          },
        });

        if (roomUpgradeUnit > 0) {
          const normRoom = detectRoomTypeFromName(roomType);
          await tx.invoiceItem.create({
            data: {
              invoiceId: draftId,
              kategori: "tambahan",
              deskripsi: `Upgrade Kamar ${normRoom} (${pax} Pax)`,
              qty: pax,
              hargaSatuan: roomUpgradeUnit,
              jumlah: roomUpgradeUnit * pax,
              status: "active",
            },
          });
        }
      }
    });

    await invoiceRepo.syncGroupTotals(group.id).catch(() => {});
    const created = await prisma.invoice.findUnique({
      where: { id: draftId },
      include: { items: true },
    });
    return created ? mapInvoice(created) : null;
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
    await invoiceRepo.syncGroupTotals(invoice.groupId).catch((err) => {
      console.warn("syncGroupTotals after invoice recalculate warning:", err);
    });
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
