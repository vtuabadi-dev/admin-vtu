import { prisma } from "@/server/db/client";
import { auditRepo } from "@/server/repositories/audit.repository";
import { invoiceRepo } from "@/server/repositories/invoice.repository";
import { fetchInvoiceAuditEntries } from "@/server/services/invoice-audit.service";
import { resolvePackageBillingConfig, resolveRoomUpgradeUnitPrice } from "@/shared/lib/billing-ssot";
import {
  buildGroupInvoiceAuditTimeline,
  buildQueueItemFromInvoiceLog,
} from "@/shared/lib/invoice-audit-log";
import type { Pembayaran } from "@/shared/types";

const REVIEW_GROUP_SELECT = {
  id: true,
  kodeRegistrasi: true,
  namaGroup: true,
  totalTagihan: true,
  totalPembayaran: true,
  sisaPembayaran: true,
  keberangkatan: {
    select: {
      id: true,
      kode: true,
      namaPaket: true,
      hargaPaket: true,
      tanggalBerangkat: true,
      tanggalPulang: true,
      hotelMekkah: true,
      hotelMadinah: true,
      hotelOptions: true,
      include: true,
      packageType: {
        select: { name: true },
      },
    },
  },
  registrationRequests: {
    select: {
      roomUpgrade: true,
      hotelUpgrade: true,
      paxCount: true,
    },
    take: 1,
  },
  invoices: {
    where: { status: { not: "cancelled" as const } },
    include: { items: true },
    orderBy: { createdAt: "desc" as const },
  },
  pembayaran: {
    select: {
      id: true,
      tanggal: true,
      jumlah: true,
      metode: true,
      bankPengirim: true,
      status: true,
      catatan: true,
      invoiceId: true,
      invoiceDriveId: true,
      buktiUrl: true,
    },
    orderBy: { tanggal: "asc" as const },
  },
  anggota: {
    select: {
      id: true,
      registrationId: true,
      namaLengkap: true,
      nomorPeserta: true,
      nomorTelepon: true,
      email: true,
      alamat: true,
      provinsi: true,
      kota: true,
      kecamatan: true,
      kelurahan: true,
      hotelMekkah: true,
      hotelMadinah: true,
      isKeretaCepat: true,
      isCityTourThoif: true,
      createdAt: true,
    },
    orderBy: [{ registrationId: "asc" as const }, { createdAt: "asc" as const }],
  },
  ketuaGroup: {
    select: {
      id: true,
      namaLengkap: true,
      nomorTelepon: true,
      email: true,
      alamat: true,
      provinsi: true,
      kota: true,
      kecamatan: true,
      kelurahan: true,
    },
  },
};

function mapPembayaran(row: any): Pembayaran {
  return {
    id: row.id,
    groupId: row.groupId,
    invoiceId: row.invoiceId ?? undefined,
    jumlah: row.jumlah,
    metode: row.metode,
    tanggal: row.tanggal.toISOString(),
    buktiUrl: row.buktiUrl ?? undefined,
    status: row.status,
    sumber: row.sumber,
    verifiedBy: row.verifiedBy ?? undefined,
    alasanReject: row.alasanReject ?? undefined,
    reviewedBy: row.reviewedBy ?? undefined,
    reviewedAt: row.reviewedAt?.toISOString(),
    bankPengirim: row.bankPengirim ?? undefined,
    nomorRekening: row.nomorRekening ?? undefined,
    catatan: row.catatan ?? undefined,
    invoiceDriveId: row.invoiceDriveId ?? undefined,
    ocrData: row.ocrData as Pembayaran["ocrData"],
    alokasi: (row.alokasi ?? []).map((a: any) => ({
      jamaahId: a.jamaahId,
      namaJamaah: a.namaJamaah,
      jumlah: a.jumlah,
    })),
  };
}

// ────────────────────────────────────────────────────────────
// Queries
// ────────────────────────────────────────────────────────────

export const pembayaranRepo = {
  async findAll(params?: { groupId?: string; status?: string; limit?: number; offset?: number }) {
    const where: any = {};
    if (params?.groupId) where.groupId = params.groupId;
    if (params?.status) where.status = params.status;

    const [rows, total] = await Promise.all([
      prisma.pembayaran.findMany({ where, include: { alokasi: true }, take: params?.limit, skip: params?.offset, orderBy: { tanggal: "desc" } }),
      prisma.pembayaran.count({ where }),
    ]);
    return { data: rows.map(mapPembayaran), total };
  },

  async findById(id: string) {
    const row = await prisma.pembayaran.findUnique({ where: { id }, include: { alokasi: true } });
    return row ? mapPembayaran(row) : null;
  },

  async findByGroup(groupId: string) {
    const rows = await prisma.pembayaran.findMany({ where: { groupId }, include: { alokasi: true }, orderBy: { tanggal: "desc" } });
    return rows.map(mapPembayaran);
  },

  async create(data: Omit<Pembayaran, "id" | "verifiedBy" | "alasanReject" | "reviewedBy" | "reviewedAt"> & { alokasi: Pembayaran["alokasi"] }) {
    const row = await prisma.pembayaran.create({
      data: {
        groupId: data.groupId,
        invoiceId: data.invoiceId ?? null,
        jumlah: data.jumlah,
        metode: data.metode,
        tanggal: new Date(data.tanggal),
        buktiUrl: data.buktiUrl ?? null,
        status: data.status,
        sumber: data.sumber,
        bankPengirim: data.bankPengirim ?? null,
        nomorRekening: data.nomorRekening ?? null,
        catatan: data.catatan ?? null,
        ocrData: data.ocrData as any,
        alokasi: {
          create: data.alokasi.map((a: any) => ({
            jamaahId: a.jamaahId,
            namaJamaah: a.namaJamaah,
            jumlah: a.jumlah,
          })),
        },
      },
      include: { alokasi: true },
    });
    return mapPembayaran(row);
  },

  async approve(id: string, verifiedBy: string) {
    const row = await prisma.pembayaran.update({
      where: { id },
      data: { status: "verified", verifiedBy, reviewedBy: verifiedBy, reviewedAt: new Date() },
      include: { alokasi: true },
    });

    // Update group totalPembayaran
    const allVerified = await prisma.pembayaran.aggregate({
      where: { groupId: row.groupId, status: "verified" },
      _sum: { jumlah: true },
    });
    await prisma.registrationGroup.update({
      where: { id: row.groupId },
      data: {
        totalPembayaran: allVerified._sum.jumlah ?? 0,
        sisaPembayaran: { set: 0 }, // will be calculated below
      },
    });
    // Recalculate sisa
    const group = await prisma.registrationGroup.findUnique({ where: { id: row.groupId } });
    if (group) {
      await prisma.registrationGroup.update({
        where: { id: row.groupId },
        data: { sisaPembayaran: Math.max(0, group.totalTagihan - (allVerified._sum.jumlah ?? 0)) },
      });
    }

    // Update invoice sisaTagihan if linked
    if (row.invoiceId) {
      const invoice = await prisma.invoice.findUnique({ where: { id: row.invoiceId } });
      if (invoice) {
        const invPayments = await prisma.pembayaran.aggregate({
          where: { invoiceId: row.invoiceId, status: "verified" },
          _sum: { jumlah: true },
        });
        await prisma.invoice.update({
          where: { id: row.invoiceId },
          data: { sisaTagihan: Math.max(0, invoice.jumlah - (invPayments._sum.jumlah ?? 0)) },
        });
      }
    }

    try {
      await auditRepo.create({
        userId: "system",
        userName: verifiedBy || "Admin",
        role: "admin_pembayaran",
        module: "pembayaran",
        action: "pembayaran.approve",
        detail: `Menyetujui pembayaran Rp ${row.jumlah.toLocaleString("id-ID")} (ID: ${row.id})`,
        entityId: row.groupId,
        entityType: "Pembayaran",
      });
    } catch { /* non-blocking audit */ }

    return mapPembayaran(row);
  },

  async reject(id: string, alasanReject: string, reviewedBy: string) {
    const row = await prisma.pembayaran.update({
      where: { id },
      data: { status: "rejected", alasanReject, reviewedBy, reviewedAt: new Date() },
      include: { alokasi: true },
    });

    try {
      await auditRepo.create({
        userId: "system",
        userName: reviewedBy || "Admin",
        role: "admin_pembayaran",
        module: "pembayaran",
        action: "pembayaran.reject",
        detail: `Menolak pembayaran Rp ${row.jumlah.toLocaleString("id-ID")} (Alasan: ${alasanReject})`,
        entityId: row.groupId,
        entityType: "Pembayaran",
      });
    } catch { /* non-blocking audit */ }

    return mapPembayaran(row);
  },

  /**
   * Fire-and-forget sync for unlinked RegistrationRequests.
   * Extracted from getReviewQueue so the read path is never blocked by writes.
   */
  async syncPendingRegistrations() {
    const unsyncedRegs = await prisma.registrationRequest.findMany({
      where: {
        groupId: null,
        OR: [
          { status: "PENDING_REVIEW" },
          { catatanAdmin: { contains: "[Bukti DP Uploaded" } },
        ],
      },
      take: 10,
      include: {
        keberangkatan: true,
        members: true,
      },
    });

    if (unsyncedRegs.length === 0) return;

    for (const reg of unsyncedRegs) {
      // Extract buktiUrl from catatanAdmin if available
      let extractedBuktiUrl: string | undefined = undefined;
      if (reg.catatanAdmin) {
        const match = reg.catatanAdmin.match(/\[Bukti DP Uploaded[^\]]*\]:\s*([^\s\n]+)/);
        if (match?.[1] && match[1] !== "File" && match[1] !== "received") {
          extractedBuktiUrl = match[1];
        }
      }

      let group = await prisma.registrationGroup.findFirst({
        where: { kodeRegistrasi: reg.kodeRegistrasi },
      });

      const memberList = (reg.members && reg.members.length > 0)
        ? (reg.members as any[]).sort((a, b) => (a.urutan || 0) - (b.urutan || 0))
        : [{ namaLengkap: reg.namaPerwakilan, jenisKelamin: "L", tempatLahir: "-", tanggalLahir: "2000-01-01", urutan: 1 }];

      const pax = reg.paxCount || memberList.length || 1;
      if (!group) {
        const pkgCfg = resolvePackageBillingConfig({
          activePackage: reg.keberangkatan,
          targetKlaster: reg.hotelUpgrade,
        });
        const basePaket = pkgCfg.hargaBase * pax;
        const roomSurcharge = resolveRoomUpgradeUnitPrice(pkgCfg, reg.roomUpgrade) * pax;
        const totalTagihan = basePaket + roomSurcharge;
        group = await prisma.registrationGroup.create({
          data: {
            kodeRegistrasi: reg.kodeRegistrasi,
            namaGroup: `GRUP ${reg.namaPerwakilan}`,
            ketuaGroupId: "",
            paketKeberangkatanId: reg.paketId,
            jumlahAnggota: reg.paxCount || memberList.length,
            totalTagihan,
            totalPembayaran: 0,
            sisaPembayaran: totalTagihan,
            status: "active",
          },
        });
      }

      // Create Jamaah records linked to valid group.id
      const createdJamaah: any[] = [];
      for (let i = 0; i < memberList.length; i++) {
        const m = memberList[i];
        const regId = `${reg.kodeRegistrasi}-${i + 1}`;
        let j = await prisma.jamaah.findUnique({ where: { registrationId: regId } });
        if (!j) {
          j = await prisma.jamaah.create({
            data: {
              registrationId: regId,
              groupId: group.id,
              nomorPeserta: regId,
              namaLengkap: m.namaLengkap || (i === 0 ? reg.namaPerwakilan : `Anggota ${i + 1}`),
              namaAyah: "",
              jenisKelamin: ((m.jenisKelamin) as any) || "L",
              tempatLahir: m.tempatLahir || "-",
              tanggalLahir: m.tanggalLahir ? new Date(m.tanggalLahir) : new Date("2000-01-01"),
              nik: "",
              nomorPaspor: "",
              masaBerlakuPaspor: new Date("2030-01-01"),
              nomorTelepon: reg.nomorTelepon,
              email: reg.emailPerwakilan,
              alamat: "-",
              provinsi: "-",
              kota: "-",
              kecamatan: "-",
              kelurahan: "-",
              status: "registered",
              hotelMekkah: "",
              hotelMadinah: "",
              syaratDisetujui: reg.termsAccepted ?? true,
            },
          });
        }
        createdJamaah.push(j);
      }

      if (createdJamaah.length > 0 && !group.ketuaGroupId) {
        await prisma.registrationGroup.update({
          where: { id: group.id },
          data: { ketuaGroupId: createdJamaah[0].id },
        });
      }

      // Materialize initial SSOT billing ledger (BILL-<groupId>) right on sync
      await invoiceRepo.ensureInitialGroupLedger(group.id, {
        roomUpgrade: reg.roomUpgrade,
        targetKlaster: reg.hotelUpgrade,
        paxCount: pax,
      }).catch((err) => console.warn("ensureInitialGroupLedger in syncPendingRegistrations warning:", err));

      // Ensure all jamaah in this registration are linked to the group
      await prisma.jamaah.updateMany({
        where: { id: { in: createdJamaah.map((j) => j.id) } },
        data: { groupId: group.id },
      });

      await prisma.registrationRequest.update({
        where: { id: reg.id },
        data: { groupId: group.id },
      });

      // Ensure payment row exists for this group
      const existingPayment = await prisma.pembayaran.findFirst({
        where: { groupId: group.id },
      });

      if (!existingPayment) {
        const nominalDp = 5000000 * (reg.paxCount || 1);
        await prisma.pembayaran.create({
          data: {
            groupId: group.id,
            jumlah: nominalDp,
            metode: "transfer",
            tanggal: reg.updatedAt || reg.createdAt,
            buktiUrl: extractedBuktiUrl,
            status: "pending",
            sumber: "jamaah",
            catatan: `DP Pendaftaran ${reg.paxCount} Pax - ${reg.namaPerwakilan} (${reg.kodeRegistrasi})`,
          },
        });
      }
    }
  },

  async getReviewQueue(statusFilter?: string) {
    // Pure read query — sync logic moved to syncPendingRegistrations()
    const includeInvoiceLogs =
      !statusFilter || statusFilter === "all" || statusFilter === "logged";
    const whereClause: any = {};
    if (statusFilter && statusFilter !== "all" && statusFilter !== "logged") {
      whereClause.status = statusFilter;
    }

    const [rows, auditEntries, revisionInvoices] = await Promise.all([
      statusFilter === "logged"
        ? Promise.resolve([])
        : prisma.pembayaran.findMany({
            where: whereClause,
            take: 150,
            orderBy: { tanggal: "desc" },
            include: {
              alokasi: true,
              group: {
                select: REVIEW_GROUP_SELECT,
              },
            },
          }),
      includeInvoiceLogs ? fetchInvoiceAuditEntries({ limit: 150 }) : Promise.resolve([]),
      includeInvoiceLogs
        ? prisma.invoice.findMany({
            where: {
              OR: [
                { nomorInvoice: { startsWith: "INV-UPD-" } },
                { nomorInvoice: { startsWith: "INV-PAX-" } },
                { nomorInvoice: { startsWith: "PINDAH-" } },
                { nomorInvoice: { startsWith: "CN-CANCEL-" } },
                { nomorInvoice: { startsWith: "REF-" } },
                { items: { some: { status: "cancelled" } } },
              ],
            },
            select: { groupId: true },
            take: 150,
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
    ]);

    // Build group cache and backfill missing groups referenced by audit entries or revision invoices
    const groupMap = new Map<string, any>();
    for (const r of rows) {
      if ((r as any).group?.id) {
        groupMap.set((r as any).group.id, (r as any).group);
      }
    }

    if (includeInvoiceLogs) {
      const missingGroupIds = new Set<string>();
      for (const ae of auditEntries) {
        if (ae.entityId && !groupMap.has(ae.entityId)) {
          missingGroupIds.add(ae.entityId);
        }
      }
      for (const inv of revisionInvoices) {
        if (inv.groupId && !groupMap.has(inv.groupId)) {
          missingGroupIds.add(inv.groupId);
        }
      }

      if (missingGroupIds.size > 0) {
        const extraGroups = await prisma.registrationGroup.findMany({
          where: { id: { in: Array.from(missingGroupIds) } },
          select: REVIEW_GROUP_SELECT,
        });
        for (const eg of extraGroups) {
          groupMap.set(eg.id, eg);
        }
      }
    }

    // Group audit entries by groupId & attach chronological invoiceLogs onto each group
    const auditByGroup = new Map<string, any[]>();
    for (const ae of auditEntries) {
      if (!ae.entityId) continue;
      const list = auditByGroup.get(ae.entityId) || [];
      list.push(ae);
      auditByGroup.set(ae.entityId, list);
    }

    const allInvoiceLogItems: any[] = [];
    if (includeInvoiceLogs) {
      const seenLogIds = new Set<string>();
      for (const [gid, g] of Array.from(groupMap.entries())) {
        const mappedInvoices = (g.invoices || []).map((inv: any) => ({
          ...inv,
          createdAt: inv.createdAt instanceof Date ? inv.createdAt.toISOString() : inv.createdAt,
          updatedAt: inv.updatedAt instanceof Date ? inv.updatedAt.toISOString() : inv.updatedAt,
          jatuhTempo: inv.jatuhTempo instanceof Date ? inv.jatuhTempo.toISOString() : inv.jatuhTempo,
          items: (inv.items || []).map((it: any) => ({
            ...it,
            cancelledAt: it.cancelledAt instanceof Date ? it.cancelledAt.toISOString() : it.cancelledAt,
          })),
        }));
        const mappedPayments = (g.pembayaran || []).map((p: any) => ({
          ...p,
          tanggal: p.tanggal instanceof Date ? p.tanggal.toISOString() : p.tanggal,
        }));
        const logs = buildGroupInvoiceAuditTimeline({
          group: {
            id: g.id,
            kodeRegistrasi: g.kodeRegistrasi,
            namaGroup: g.namaGroup,
            namaPaket: g.keberangkatan?.namaPaket,
            invoices: mappedInvoices,
            pembayaran: mappedPayments,
          },
          auditEntries: auditByGroup.get(gid) || [],
          order: "desc",
        });
        g.invoiceLogs = logs;

        for (const log of logs) {
          if (seenLogIds.has(log.id)) continue;
          seenLogIds.add(log.id);
          allInvoiceLogItems.push(
            buildQueueItemFromInvoiceLog(log, {
              ...g,
              roomUpgrade: g.registrationRequests?.[0]?.roomUpgrade || g.roomUpgrade || null,
              hotelUpgrade: g.registrationRequests?.[0]?.hotelUpgrade || g.hotelUpgrade || null,
            })
          );
        }
      }
    }

    // Deduplicate mapped payment rows by unique groupId + status + sumber + buktiUrl so identical duplicate entries are never shown twice
    const seen = new Set<string>();
    const uniqueRows: any[] = [];
    for (const r of rows) {
      const key = `${r.groupId}_${r.status}_${r.sumber}_${r.jumlah}_${r.buktiUrl || ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRows.push(r);
      }
    }

    const paymentItems = uniqueRows.map((r: any) => ({
      ...mapPembayaran(r),
      recordType: "payment" as const,
      isLogOnly: false,
      kodeRegistrasi: (r as any).group?.kodeRegistrasi,
      namaGroup: (r as any).group?.namaGroup,
      roomUpgrade: (r as any).group?.registrationRequests?.[0]?.roomUpgrade || (r as any).group?.roomUpgrade || null,
      hotelUpgrade: (r as any).group?.registrationRequests?.[0]?.hotelUpgrade || (r as any).group?.hotelUpgrade || null,
      group: groupMap.get(r.groupId) || (r as any).group,
    }));

    return [...paymentItems, ...allInvoiceLogItems].sort((a, b) => {
      const ta = new Date(a.tanggal || 0).getTime() || 0;
      const tb = new Date(b.tanggal || 0).getTime() || 0;
      return tb - ta;
    });
  },

  async delete(id: string, cascadeRegistration = false) {
    if (String(id).startsWith("invlog-")) {
      throw new Error("Log pembaruan invoice bersifat audit permanen dan tidak dapat dihapus");
    }
    const payment = await prisma.pembayaran.findUnique({
      where: { id },
      include: {
        group: {
          include: {
            pembayaran: true,
            anggota: true,
          },
        },
      },
    });

    if (!payment) throw new Error("Data pembayaran tidak ditemukan");

    const groupId = payment.groupId;
    const invoiceId = payment.invoiceId;

    // 1. Delete allocations
    await prisma.alokasiPembayaran.deleteMany({ where: { pembayaranId: id } }).catch(() => {});

    // 2. Delete invoice if linked
    if (invoiceId) {
      await prisma.invoiceItem.deleteMany({ where: { invoiceId } }).catch(() => {});
      await prisma.invoice.deleteMany({ where: { OR: [{ id: invoiceId }, { nomorInvoice: invoiceId }] } }).catch(() => {});
    }

    // 3. Delete the payment itself
    await prisma.pembayaran.delete({ where: { id } });

    // 4. Update group or cascade delete group if requested
    if (groupId) {
      if (cascadeRegistration && payment.group) {
        const kodeReg = payment.group.kodeRegistrasi;
        // Clean up group, members, registration requests, jamaah
        await prisma.invoiceItem.deleteMany({ where: { invoice: { groupId } } }).catch(() => {});
        await prisma.invoice.deleteMany({ where: { groupId } }).catch(() => {});
        await prisma.pembayaran.deleteMany({ where: { groupId } }).catch(() => {});
        await prisma.invoiceSplitConfig.deleteMany({ where: { groupId } }).catch(() => {});
        await prisma.reminder.deleteMany({ where: { groupId } }).catch(() => {});

        if (kodeReg) {
          const regReq = await prisma.registrationRequest.findUnique({ where: { kodeRegistrasi: kodeReg }, select: { id: true } });
          if (regReq) {
            await prisma.registrationMember.deleteMany({ where: { requestId: regReq.id } }).catch(() => {});
            await prisma.registrationRequest.delete({ where: { id: regReq.id } }).catch(() => {});
          }
        }

        const jamaahIds = payment.group.anggota.map((a: any) => a.id);
        if (jamaahIds.length > 0) {
          await prisma.dokumenItem.deleteMany({ where: { jamaahId: { in: jamaahIds } } }).catch(() => {});
          await prisma.manifestRow.deleteMany({ where: { jamaahId: { in: jamaahIds } } }).catch(() => {});
          await prisma.penghuniKamar.deleteMany({ where: { jamaahId: { in: jamaahIds } } }).catch(() => {});
        }

        // Delete group and jamaah
        await prisma.$executeRawUnsafe(`DELETE FROM "registration_groups" WHERE "id" = '${groupId.replace(/'/g, "''")}'`).catch(() => {});
        if (jamaahIds.length > 0) {
          const inList = jamaahIds.map((jid: string) => `'${jid.replace(/'/g, "''")}'`).join(",");
          await prisma.$executeRawUnsafe(`DELETE FROM "jamaah" WHERE "id" IN (${inList})`).catch(() => {});
        }
      } else {
        // Recalculate remaining payments
        const remaining = await prisma.pembayaran.findMany({
          where: { groupId, status: "verified" },
        });
        const newTotalBayar = remaining.reduce((sum, p) => sum + p.jumlah, 0);
        const groupRecord = await prisma.registrationGroup.findUnique({ where: { id: groupId } });
        if (groupRecord) {
          const newSisa = Math.max(0, groupRecord.totalTagihan - newTotalBayar);
          await prisma.registrationGroup.update({
            where: { id: groupId },
            data: {
              totalPembayaran: newTotalBayar,
              sisaPembayaran: newSisa,
            },
          });
        }
      }
    }

    return { success: true, id };
  },

  async deleteAll(filter?: { status?: string }) {
    const where: any = {};
    if (filter?.status && filter.status !== "all") {
      where.status = filter.status;
    }

    const payments = await prisma.pembayaran.findMany({ where, select: { id: true, invoiceId: true } });
    const ids = payments.map((p) => p.id);
    const invoiceIds = payments.map((p) => p.invoiceId).filter(Boolean) as string[];

    if (ids.length > 0) {
      await prisma.alokasiPembayaran.deleteMany({ where: { pembayaranId: { in: ids } } }).catch(() => {});
      if (invoiceIds.length > 0) {
        await prisma.invoiceItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } }).catch(() => {});
        await prisma.invoice.deleteMany({ where: { OR: [{ id: { in: invoiceIds } }, { nomorInvoice: { in: invoiceIds } }] } }).catch(() => {});
      }
      await prisma.pembayaran.deleteMany({ where: { id: { in: ids } } });
    }

    return { count: ids.length };
  },
};
