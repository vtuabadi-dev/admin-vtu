// ============================================================
// Prisma Seed Script — Population from mock/data.ts
// Run: npx prisma db seed (after prisma migrate deploy)
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
  const ADMIN_HASH = "$2b$12$MlkLoZElDrwG9V5ANA6tGurAdNizkti.4hZr9fQlZpi0WBm4R5J1m";
  const SUPER_ADMIN_HASH = "$2b$12$KJLXR.8XT4KAg.riXcJxB.ddrK4t0ACrBq6y2XZUi7rnQYMMTA/Ui";

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

  // ── 3 & 4: Groups + Jamaah (1 transaksi — circular FK) ──────
  // jamaah.groupId ↔ registration_groups.ketuaGroupId
  // Solusi: buat FK DEFERRABLE, lalu deferred check dalam transaksi tunggal

  // 3a. Alter FK constraints jadi DEFERRABLE
  await prisma.$executeRawUnsafe(`ALTER TABLE registration_groups DROP CONSTRAINT IF EXISTS "registration_groups_ketuaGroupId_fkey"`);
  await prisma.$executeRawUnsafe(`ALTER TABLE registration_groups ADD CONSTRAINT "registration_groups_ketuaGroupId_fkey" FOREIGN KEY ("ketuaGroupId") REFERENCES jamaah(id) ON DELETE RESTRICT ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED`);
  await prisma.$executeRawUnsafe(`ALTER TABLE jamaah DROP CONSTRAINT IF EXISTS "jamaah_groupId_fkey"`);
  await prisma.$executeRawUnsafe(`ALTER TABLE jamaah ADD CONSTRAINT "jamaah_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES registration_groups(id) ON DELETE RESTRICT ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED`);
  console.log("  ✓ FK constraints made DEFERRABLE");

  await prisma.$transaction(async (tx) => {
    // Defer FK checks sampai COMMIT
    await tx.$executeRawUnsafe("SET CONSTRAINTS ALL DEFERRED");

    // 3a. Insert groups via raw SQL (lengkap dengan ketuaGroupId asli)
    for (const g of mockGroups) {
      await tx.$executeRawUnsafe(
        `INSERT INTO registration_groups (id, "kodeRegistrasi", "namaGroup", "ketuaGroupId", "paketKeberangkatanId", "jumlahAnggota", "totalTagihan", "totalPembayaran", "sisaPembayaran", status, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::"GroupStatus", NOW(), NOW())
         ON CONFLICT ("kodeRegistrasi") DO NOTHING`,
        g.id,
        g.kodeRegistrasi,
        g.namaGroup,
        g.ketuaGroupId,
        g.paketKeberangkatanId,
        g.jumlahAnggota,
        g.totalTagihan,
        g.totalPembayaran,
        g.sisaPembayaran,
        "active",
      );
    }

    // 3b. Insert jamaah via raw SQL (groupId references groups di atas)
    for (const j of mockJamaah) {
      await tx.$executeRawUnsafe(
        `INSERT INTO jamaah (id, "registrationId", "groupId", "nomorPeserta", "namaLengkap", "namaAyah", "jenisKelamin", "tempatLahir", "tanggalLahir", nik, "nomorPaspor", "masaBerlakuPaspor", "nomorTelepon", email, alamat, provinsi, kota, kecamatan, kelurahan, "tandaTanganDigital", "syaratDisetujui", status, "hotelMekkah", "hotelMadinah", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7::"JenisKelamin", $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22::"StatusJamaah", $23, $24, NOW(), NOW())
         ON CONFLICT ("registrationId") DO NOTHING`,
        j.id,
        j.registrationId,
        j.groupId,
        j.nomorPeserta,
        j.namaLengkap,
        j.namaAyah,
        j.jenisKelamin,
        j.tempatLahir,
        new Date(j.tanggalLahir),
        j.nik,
        j.nomorPaspor,
        new Date(j.masaBerlakuPaspor),
        j.nomorTelepon,
        j.email,
        j.alamat,
        j.provinsi,
        j.kota,
        j.kecamatan,
        j.kelurahan,
        j.tandaTanganDigital ?? null,
        j.syaratDisetujui,
        j.status,
        j.hotelMekkah,
        j.hotelMadinah,
      );

      // Dokumen per jamaah
      for (const doc of j.dokumen) {
        await tx.$executeRawUnsafe(
          `INSERT INTO dokumen_items (id, "jamaahId", jenis, wajib, status, "fileUrl", catatan, "uploadedAt", "verifiedAt", "verifiedBy", "dataStatus", "fileStatus", "manualData", "ocrData", "ocrRetryCount", "qualityCheck")
           VALUES ($1, $2, $3::"DokumenJenis", $4, $5::"StatusDokumen", $6, $7, $8, $9, $10, $11::"DokumenDataStatus", $12::"DokumenFileStatus", $13::jsonb, $14::jsonb, $15, $16::jsonb)
           ON CONFLICT (id) DO NOTHING`,
          doc.id,
          j.id,
          doc.jenis,
          doc.wajib,
          doc.status,
          doc.fileUrl ?? null,
          doc.catatan ?? null,
          doc.uploadedAt ? new Date(doc.uploadedAt) : null,
          doc.verifiedAt ? new Date(doc.verifiedAt) : null,
          doc.verifiedBy ?? null,
          doc.dataStatus ?? null,
          doc.fileStatus ?? null,
          JSON.stringify(doc.manualData ?? {}),
          JSON.stringify(doc.ocrData ?? {}),
          doc.ocrRetryCount ?? 0,
          JSON.stringify(doc.qualityCheck ?? {}),
        );
      }
    }
    // FK check terjadi di sini (COMMIT) — kedua sisi sudah lengkap
  });
  console.log(`  ✓ ${mockGroups.length} registration groups`);
  console.log(`  ✓ ${mockJamaah.length} jamaah with documents`);

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
