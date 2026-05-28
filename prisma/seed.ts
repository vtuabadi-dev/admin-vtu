// ============================================================
// Prisma Seed Script — Population from mock/data.ts
// Run: npx prisma db seed (after prisma migrate dev)
// ============================================================

import { PrismaClient } from "@prisma/client";
import {
  mockKeberangkatan,
  mockJamaah,
  mockGroups,
  mockInvoices,
  mockPembayaran,
  mockManifests,
  mockRoomings,
  mockReminders,
} from "../src/services/mock/data";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ── 1. Users ────────────────────────────────────────────────
  // Shared password for operational admins: "admin123"
  // Super admin password: "SuperAdmin123!"
  const ADMIN_HASH = "$2b$12$iPziIA.8ozPqTQ8PHljdh.abAF8rzbZZGvO3hXSIdjpntBDPzIFBG";
  const SUPER_ADMIN_HASH = "$2b$12$okEmUFNfL5/KZc9W3qO87OIqwzF4lw/KUXY01bCFxu1XiEy2P8Wea";

  const users = [
    { name: "Super Admin", email: "superadmin@vtu.id", passwordHash: SUPER_ADMIN_HASH, role: "super_admin" as const },
    { name: "Super Admin (Legacy)", email: "admin@vtu.id", passwordHash: ADMIN_HASH, role: "super_admin" as const },
    { name: "Admin Operasional", email: "ops@vtu.id", passwordHash: ADMIN_HASH, role: "admin_operasional" as const },
    { name: "Admin Pembayaran", email: "finance@vtu.id", passwordHash: ADMIN_HASH, role: "admin_pembayaran" as const },
    { name: "Admin Manifest", email: "manifest@vtu.id", passwordHash: ADMIN_HASH, role: "admin_manifest" as const },
    { name: "Admin Dokumen", email: "docs@vtu.id", passwordHash: ADMIN_HASH, role: "admin_dokumen" as const },
    { name: "Tour Leader", email: "tl@vtu.id", passwordHash: ADMIN_HASH, role: "tour_leader" as const },
    { name: "Jamaah Demo", email: "jamaah@vtu.id", passwordHash: ADMIN_HASH, role: "jamaah" as const },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: u,
    });
  }
  console.log(`  ✓ ${users.length} users`);

  // ── 2. Keberangkatan ──────────────────────────────────────
  for (const k of mockKeberangkatan) {
    await prisma.keberangkatan.upsert({
      where: { kode: k.kode },
      update: {},
      create: {
        id: k.id,
        kode: k.kode,
        namaPaket: k.namaPaket,
        hargaPaket: k.hargaPaket,
        tanggalBerangkat: new Date(k.tanggalBerangkat),
        tanggalPulang: new Date(k.tanggalPulang),
        maskapai: k.maskapai,
        nomorPenerbangan: k.nomorPenerbangan,
        hotelMekkah: k.hotelMekkah,
        hotelMadinah: k.hotelMadinah,
        hotelOptions: k.hotelOptions,
        status: k.status,
        kuota: k.kuota,
        terisi: k.terisi,
      },
    });
  }
  console.log(`  ✓ ${mockKeberangkatan.length} keberangkatan`);

  // ── 3. Jamaah ─────────────────────────────────────────────
  for (const j of mockJamaah) {
    await prisma.jamaah.upsert({
      where: { registrationId: j.registrationId },
      update: {},
      create: {
        id: j.id,
        registrationId: j.registrationId,
        groupId: j.groupId,
        nomorPeserta: j.nomorPeserta,
        namaLengkap: j.namaLengkap,
        namaAyah: j.namaAyah,
        jenisKelamin: j.jenisKelamin,
        tempatLahir: j.tempatLahir,
        tanggalLahir: new Date(j.tanggalLahir),
        nik: j.nik,
        nomorPaspor: j.nomorPaspor,
        masaBerlakuPaspor: new Date(j.masaBerlakuPaspor),
        nomorTelepon: j.nomorTelepon,
        email: j.email,
        alamat: j.alamat,
        provinsi: j.provinsi,
        kota: j.kota,
        kecamatan: j.kecamatan,
        kelurahan: j.kelurahan,
        tandaTanganDigital: j.tandaTanganDigital,
        syaratDisetujui: j.syaratDisetujui,
        status: j.status,
        hotelMekkah: j.hotelMekkah,
        hotelMadinah: j.hotelMadinah,
      },
    });

    // ── Dokumen per jamaah ──────────────────────────────────
    for (const doc of j.dokumen) {
      await prisma.dokumenItem.upsert({
        where: { id: doc.id },
        update: {},
        create: {
          id: doc.id,
          jamaahId: j.id,
          jenis: doc.jenis,
          wajib: doc.wajib,
          status: doc.status,
          fileUrl: doc.fileUrl,
          catatan: doc.catatan,
          uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt) : null,
          verifiedAt: doc.verifiedAt ? new Date(doc.verifiedAt) : null,
          verifiedBy: doc.verifiedBy,
          dataStatus: doc.dataStatus as any,
          fileStatus: doc.fileStatus as any,
          manualData: doc.manualData as any,
          ocrData: doc.ocrData as any,
          ocrRetryCount: doc.ocrRetryCount ?? 0,
          qualityCheck: doc.qualityCheck as any,
        },
      });
    }
  }
  console.log(`  ✓ ${mockJamaah.length} jamaah with documents`);

  // ── 4. Registration Groups ────────────────────────────────
  for (const g of mockGroups) {
    await prisma.registrationGroup.upsert({
      where: { kodeRegistrasi: g.kodeRegistrasi },
      update: {},
      create: {
        id: g.id,
        kodeRegistrasi: g.kodeRegistrasi,
        namaGroup: g.namaGroup,
        ketuaGroupId: g.ketuaGroupId,
        paketKeberangkatanId: g.paketKeberangkatanId,
        jumlahAnggota: g.jumlahAnggota,
        totalTagihan: g.totalTagihan,
        totalPembayaran: g.totalPembayaran,
        sisaPembayaran: g.sisaPembayaran,
        status: "active",
      },
    });
  }
  console.log(`  ✓ ${mockGroups.length} registration groups`);

  // ── 5. Invoices ───────────────────────────────────────────
  for (const inv of mockInvoices) {
    await prisma.invoice.upsert({
      where: { nomorInvoice: inv.nomorInvoice },
      update: {},
      create: {
        id: inv.id,
        nomorInvoice: inv.nomorInvoice,
        groupId: inv.groupId,
        tipe: inv.tipe,
        jumlah: inv.jumlah,
        sisaTagihan: inv.sisaTagihan,
        status: inv.status,
        jatuhTempo: new Date(inv.jatuhTempo),
        createdAt: new Date(inv.createdAt),
        updatedAt: new Date(inv.updatedAt),
        items: {
          create: inv.items.map((item) => ({
            id: item.id,
            kategori: item.kategori,
            deskripsi: item.deskripsi,
            qty: item.qty,
            hargaSatuan: item.hargaSatuan,
            jumlah: item.jumlah,
            status: item.status,
          })),
        },
      },
    });
  }
  console.log(`  ✓ ${mockInvoices.length} invoices`);

  // ── 6. Pembayaran ─────────────────────────────────────────
  for (const p of mockPembayaran) {
    await prisma.pembayaran.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        groupId: p.groupId,
        invoiceId: p.invoiceId,
        jumlah: p.jumlah,
        metode: p.metode,
        tanggal: new Date(p.tanggal),
        buktiUrl: p.buktiUrl,
        status: p.status,
        sumber: p.sumber,
        verifiedBy: p.verifiedBy,
        alasanReject: p.alasanReject,
        reviewedBy: p.reviewedBy,
        reviewedAt: p.reviewedAt ? new Date(p.reviewedAt) : null,
        bankPengirim: p.bankPengirim,
        nomorRekening: p.nomorRekening,
        catatan: p.catatan,
        ocrData: p.ocrData as any,
        alokasi: {
          create: p.alokasi.map((a) => ({
            id: `${p.id}-alok-${a.jamaahId}`,
            jamaahId: a.jamaahId,
            namaJamaah: a.namaJamaah,
            jumlah: a.jumlah,
          })),
        },
      },
    });
  }
  console.log(`  ✓ ${mockPembayaran.length} pembayaran`);

  // ── 7. Manifests ──────────────────────────────────────────
  for (const m of mockManifests) {
    await prisma.manifest.upsert({
      where: { kode: m.kode },
      update: {},
      create: {
        id: m.id,
        keberangkatanId: m.keberangkatanId,
        kode: m.kode,
        namaManifest: m.namaManifest,
        templateId: m.templateId,
        hotelMekkah: m.hotelMekkah,
        hotelMadinah: m.hotelMadinah,
        status: m.status,
        createdAt: new Date(m.createdAt),
        updatedAt: new Date(m.updatedAt),
        rows: {
          create: m.data.map((row) => ({
            id: row.id,
            nomorUrut: row.nomorUrut,
            jamaahId: row.jamaahId,
            nomorPaspor: row.nomorPaspor,
            namaLengkap: row.namaLengkap,
            tempatLahir: row.tempatLahir,
            tanggalLahir: row.tanggalLahir,
            nomorKursi: row.nomorKursi,
            nomorKamar: row.nomorKamar,
            catatan: row.catatan,
          })),
        },
      },
    });
  }
  console.log(`  ✓ ${mockManifests.length} manifests`);

  // ── 8. Roomings ───────────────────────────────────────────
  for (const r of mockRoomings) {
    await prisma.rooming.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        keberangkatanId: r.keberangkatanId,
        hotelMekkah: r.hotelMekkah,
        hotelMadinah: r.hotelMadinah,
        hotelNama: r.hotelNama,
        status: r.status,
        createdAt: new Date(r.createdAt),
        kamar: {
          create: r.kamar.map((k) => ({
            id: k.id,
            nomorKamar: k.nomorKamar,
            tipe: k.tipe,
            lantai: k.lantai,
            mixLabel: k.mixLabel,
            penghuni: {
              create: k.penghuni.map((p) => ({
                id: `${k.id}-ph-${p.jamaahId}`,
                jamaahId: p.jamaahId,
                namaLengkap: p.namaLengkap,
                jenisKelamin: p.jenisKelamin,
                isPasangan: p.isPasangan ?? false,
              })),
            },
          })),
        },
      },
    });
  }
  console.log(`  ✓ ${mockRoomings.length} roomings`);

  // ── 9. Reminders ──────────────────────────────────────────
  for (const rem of mockReminders) {
    await prisma.reminder.upsert({
      where: { id: rem.id },
      update: {},
      create: {
        id: rem.id,
        groupId: rem.groupId,
        jamaahId: rem.jamaahId,
        invoiceId: rem.invoiceId,
        tipe: rem.tipe,
        pesan: rem.pesan,
        dikirimPada: new Date(rem.dikirimPada),
        status: rem.status,
      },
    });
  }
  console.log(`  ✓ ${mockReminders.length} reminders`);

  console.log("\nSeed complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
