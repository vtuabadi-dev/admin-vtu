import { prisma } from "@/server/db/client";
import type { Pembayaran } from "@/shared/types";

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

    return mapPembayaran(row);
  },

  async reject(id: string, alasanReject: string, reviewedBy: string) {
    const row = await prisma.pembayaran.update({
      where: { id },
      data: { status: "rejected", alasanReject, reviewedBy, reviewedAt: new Date() },
      include: { alokasi: true },
    });
    return mapPembayaran(row);
  },

  async getReviewQueue(statusFilter?: string) {
    // 1. Lightweight sync only for unlinked RegistrationRequests (where groupId is null)
    try {
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

      if (unsyncedRegs.length > 0) {
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

          const parts = reg.kodeRegistrasi.split("-");
          const year = parts[1] ?? new Date().getFullYear().toString();
          const seq = parts[2] ?? "00001";

          const memberList = (reg.members && reg.members.length > 0)
            ? (reg.members as any[]).sort((a, b) => (a.urutan || 0) - (b.urutan || 0))
            : [{ namaLengkap: reg.namaPerwakilan, jenisKelamin: "L", tempatLahir: "-", tanggalLahir: "2000-01-01", urutan: 1 }];

          // Ensure RegistrationGroup exists FIRST so Jamaah has a valid groupId foreign key
          if (!group) {
            const totalTagihan = (reg.keberangkatan?.hargaPaket || 0) * (reg.paxCount || memberList.length || 1);
            group = await prisma.registrationGroup.create({
              data: {
                kodeRegistrasi: reg.kodeRegistrasi,
                namaGroup: `GRUP ${reg.namaPerwakilan}`,
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
                  nomorPeserta: `PS/${year}/${seq}/${i + 1}`,
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
      }
    } catch (syncErr) {
      console.warn("[pembayaran-repo] Failed auto-syncing pending registrations to review queue:", syncErr);
    }

    // 2. Query all Pembayaran rows with full relations
    const whereClause: any = {};
    if (statusFilter && statusFilter !== "all") {
      whereClause.status = statusFilter;
    }
    const rows = await prisma.pembayaran.findMany({
      where: whereClause,
      take: 150,
      orderBy: { tanggal: "desc" },
      include: {
        alokasi: true,
        group: {
          select: {
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
                packageType: {
                  select: { name: true },
                },
              },
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
              },
              orderBy: { tanggal: "asc" },
            },
            anggota: {
              select: {
                id: true,
                namaLengkap: true,
                nomorPeserta: true,
                nomorTelepon: true,
                email: true,
                alamat: true,
                provinsi: true,
                kota: true,
                kecamatan: true,
                kelurahan: true,
                dokumen: {
                  select: {
                    jenis: true,
                    manualData: true,
                    ocrData: true,
                  },
                },
              },
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
                dokumen: {
                  select: {
                    jenis: true,
                    manualData: true,
                    ocrData: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    // Deduplicate mapped rows by unique groupId + status + sumber + buktiUrl so identical duplicate entries are never shown twice
    const seen = new Set<string>();
    const uniqueRows: any[] = [];
    for (const r of rows) {
      const key = `${r.groupId}_${r.status}_${r.sumber}_${r.jumlah}_${r.buktiUrl || ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRows.push(r);
      }
    }

    return uniqueRows.map((r: any) => ({
      ...mapPembayaran(r),
      kodeRegistrasi: (r as any).group?.kodeRegistrasi,
      namaGroup: (r as any).group?.namaGroup,
      group: (r as any).group,
    }));
  },

  async delete(id: string, cascadeRegistration = false) {
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
