// ============================================================
// Dev/QA Seed Script — 100+ Jamaah Operational Scenario
// Run: npx tsx prisma/seed-dev.ts
// ============================================================
// Menghasilkan:
//   100+ Jamaah dalam 10+ RegistrationGroup
//   5 Keberangkatan berbeda
//   Split invoice (A/B/C) scenarios
//   Hotel combination + rooming
//   Variasi status dokumen (lengkap, pending, revisi)
//   Manifest dengan sequencing
//   Pembayaran (lunas, partial, overdue)
//   Reminder items
//   Notifications
//   Audit log entries
// ============================================================

import { PrismaClient } from "@prisma/client";
import type { DokumenJenis } from "@/shared/types";

const prisma = new PrismaClient();

// ── Constants ─────────────────────────────────────────────────

const ADMIN_HASH = "$2b$12$7Y0gv8aqa5GaWfmvEcHNI.Ys/TjVDLmBKN5RViypFPJEJ0YhULtBy";
const SUPER_ADMIN_HASH = "$2b$12$VS0HspiCaCchdtNMNpWDgeRNefq/OX0iOPWnpn2UIzP45mZPXwimS";
const NOW = new Date();

const NAMA_DEPAN = [
  "Ahmad", "Budi", "Cecep", "Dedi", "Eko", "Fajar", "Gilang", "Hadi", "Iman", "Joko",
  "Krisna", "Lukman", "Maman", "Nana", "Opik", "Pandu", "Qomar", "Rudi", "Samsul", "Tono",
  "Ujang", "Vino", "Wawan", "Yanto", "Zainal", "Arif", "Bambang", "Caca", "Dodi", "Endang",
  "Fitri", "Gina", "Hani", "Indah", "Jamilah", "Kiki", "Lia", "Mira", "Nia", "Ovi",
  "Putri", "Rina", "Siti", "Tari", "Umi", "Vina", "Wati", "Yuli", "Zahra", "Nurul",
];
const NAMA_BELAKANG = [
  "Abdullah", "Basuki", "Cahyono", "Darmawan", "Effendi", "Firmansyah", "Gunawan", "Hartono",
  "Iskandar", "Jaya", "Kusuma", "Lesmana", "Mahendra", "Nugroho", "Oktavian", "Pratama",
  "Ramadhan", "Santoso", "Tanjung", "Utama", "Wibowo", "Yudhistira", "Zulkarnaen",
];

// ── Helpers ───────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)]!;
}

function randomDate(startDaysAgo: number, endDaysAgo: number): Date {
  const start = NOW.getTime() - startDaysAgo * 86400000;
  const end = NOW.getTime() - endDaysAgo * 86400000;
  return new Date(start + Math.random() * (end - start));
}

const KOTA = ["Jakarta", "Bandung", "Surabaya", "Semarang", "Yogyakarta", "Medan", "Palembang", "Makassar", "Balikpapan", "Pekanbaru"];
const DOKUMEN_TYPES: DokumenJenis[] = ["ktp", "kk", "paspor", "akta", "pas_foto", "vaksin"];
const WAJIB_DOKUMEN: DokumenJenis[] = ["ktp", "paspor", "pas_foto", "vaksin"];

// ── Main seed ─────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding dev/QA data — 100+ Jamaah scenario...\n");

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.auditEntry.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.pembayaran.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.manifestRow.deleteMany();
  await prisma.manifest.deleteMany();
  await prisma.penghuniKamar.deleteMany();
  await prisma.kamar.deleteMany();
  await prisma.rooming.deleteMany();
  await prisma.dokumenItem.deleteMany();
  await prisma.jamaah.deleteMany();
  await prisma.registrationGroup.deleteMany();
  await prisma.keberangkatan.deleteMany();
  
  // Clean master data
  await prisma.masterAirline.deleteMany();
  await prisma.masterHotel.deleteMany();
  await prisma.masterCity.deleteMany();
  await prisma.masterPackageType.deleteMany();
  await prisma.masterPerlengkapan.deleteMany();

  await prisma.user.deleteMany();
  console.log("✅ Existing data cleaned\n");

  // ── 1. Users ────────────────────────────────────────────────
  const users = await Promise.all([
    prisma.user.create({ data: { name: "Super Admin", email: "superadmin@vtu.id", passwordHash: SUPER_ADMIN_HASH, role: "super_admin" } }),
    prisma.user.create({ data: { name: "Super Admin (Legacy)", email: "admin@vtu.id", passwordHash: ADMIN_HASH, role: "super_admin" } }),
    prisma.user.create({ data: { name: "Admin Operasional", email: "ops@vtu.id", passwordHash: ADMIN_HASH, role: "admin_operasional" } }),
    prisma.user.create({ data: { name: "Admin Pembayaran", email: "finance@vtu.id", passwordHash: ADMIN_HASH, role: "admin_pembayaran" } }),
    prisma.user.create({ data: { name: "Admin Manifest", email: "manifest@vtu.id", passwordHash: ADMIN_HASH, role: "admin_manifest" } }),
    prisma.user.create({ data: { name: "Admin Dokumen", email: "dokumen@vtu.id", passwordHash: ADMIN_HASH, role: "admin_dokumen" } }),
    prisma.user.create({ data: { name: "Tour Leader 1", email: "tl1@vtu.id", passwordHash: ADMIN_HASH, role: "tour_leader" } }),
    prisma.user.create({ data: { name: "Tour Leader 2", email: "tl2@vtu.id", passwordHash: ADMIN_HASH, role: "tour_leader" } }),
  ]);
  console.log(`✅ Created ${users.length} users`);

  // ── 1b. Master Cities ───────────────────────────────────────
  const cities = {
    cgk: await prisma.masterCity.create({ data: { code: "CGK", name: "Jakarta", country: "Indonesia", isActive: true } }),
    sub: await prisma.masterCity.create({ data: { code: "SUB", name: "Surabaya", country: "Indonesia", isActive: true } }),
    upg: await prisma.masterCity.create({ data: { code: "UPG", name: "Makassar", country: "Indonesia", isActive: true } }),
    med: await prisma.masterCity.create({ data: { code: "MED", name: "Madinah", country: "Arab Saudi", isActive: true } }),
    jed: await prisma.masterCity.create({ data: { code: "JED", name: "Jeddah", country: "Arab Saudi", isActive: true } }),
    mek: await prisma.masterCity.create({ data: { code: "MEK", name: "Mekkah", country: "Arab Saudi", isActive: true } }),
  };
  console.log("✅ Created master cities");

  // ── 1c. Master Airlines ──────────────────────────────────────
  const airlines = {
    ga: await prisma.masterAirline.create({ data: { code: "GA", name: "Garuda Indonesia", isActive: true } }),
    sv: await prisma.masterAirline.create({ data: { code: "SV", name: "Saudia Airlines", isActive: true } }),
    qr: await prisma.masterAirline.create({ data: { code: "QR", name: "Qatar Airways", isActive: true } }),
    ek: await prisma.masterAirline.create({ data: { code: "EK", name: "Emirates", isActive: true } }),
    jt: await prisma.masterAirline.create({ data: { code: "JT", name: "Lion Air", isActive: true } }),
  };
  console.log("✅ Created master airlines");

  // ── 1d. Master Hotels ────────────────────────────────────────
  const hotels = {
    swiss: await prisma.masterHotel.create({ data: { code: "SWISS-MEK", name: "Swissotel Maqam", cityId: cities.mek.id, starRating: 5, isActive: true } }),
    hyatt: await prisma.masterHotel.create({ data: { code: "HYATT-MEK", name: "Hyatt Regency", cityId: cities.mek.id, starRating: 5, isActive: true } }),
    midan: await prisma.masterHotel.create({ data: { code: "MIDAN-MEK", name: "Midan Hotel", cityId: cities.mek.id, starRating: 4, isActive: true } }),
    fairmont: await prisma.masterHotel.create({ data: { code: "FAIRMONT-MEK", name: "Fairmont Clock Tower", cityId: cities.mek.id, starRating: 5, isActive: true } }),
    hilton: await prisma.masterHotel.create({ data: { code: "HILTON-MEK", name: "Hilton Convention", cityId: cities.mek.id, starRating: 5, isActive: true } }),
    anwar: await prisma.masterHotel.create({ data: { code: "ANWAR-MED", name: "Anwar Al Madinah", cityId: cities.med.id, starRating: 5, isActive: true } }),
    dallah: await prisma.masterHotel.create({ data: { code: "DALLAH-MED", name: "Dallah Taibah", cityId: cities.med.id, starRating: 5, isActive: true } }),
    eiman: await prisma.masterHotel.create({ data: { code: "EIMAN-MED", name: "Al Eiman Royal", cityId: cities.med.id, starRating: 5, isActive: true } }),
    oberoi: await prisma.masterHotel.create({ data: { code: "OBEROI-MED", name: "Oberoi Madinah", cityId: cities.med.id, starRating: 5, isActive: true } }),
    pullman: await prisma.masterHotel.create({ data: { code: "PULLMAN-MED", name: "Pullman Zamzam", cityId: cities.med.id, starRating: 5, isActive: true } }),
  };
  console.log("✅ Created master hotels");

  // ── 1e. Master Package Types ─────────────────────────────────
  const packageTypes = {
    reg: await prisma.masterPackageType.create({ data: { code: "REG", name: "Umroh Reguler", isActive: true } }),
    plt: await prisma.masterPackageType.create({ data: { code: "PLT", name: "Umroh Plus Turki", isActive: true } }),
    ram: await prisma.masterPackageType.create({ data: { code: "RAM", name: "Umroh Ramadhan", isActive: true } }),
    syw: await prisma.masterPackageType.create({ data: { code: "SYW", name: "Umroh Syawal", isActive: true } }),
  };
  console.log("✅ Created master package types");

  // ── 1f. Master Perlengkapan ──────────────────────────────────
  await prisma.masterPerlengkapan.createMany({
    data: [
      { code: "P1", name: "Koper Besar", isActive: true },
      { code: "P2", name: "Koper Kabin", isActive: true },
      { code: "P3", name: "Seragam Batik", isActive: true },
      { code: "P4", name: "ID Card", isActive: true },
      { code: "P5", name: "Buku Manasik", isActive: true },
      { code: "P6", name: "Zamzam 5L", isActive: true },
    ]
  });
  console.log("✅ Created master perlengkapan");

  // ── 2. Keberangkatan ─────────────────────────────────────────
  const keberangkatanList = await Promise.all([
    prisma.keberangkatan.create({ data: {
      kode: "KBR-1447-001", namaPaket: "Umroh Regular — Muharram 1447H",
      tanggalBerangkat: new Date("2026-07-15"), tanggalPulang: new Date("2026-07-30"),
      maskapai: "Saudia Airlines", nomorPenerbangan: "SV-800",
      hotelMekkah: "Swissotel Maqam", hotelMadinah: "Anwar Al Madinah",
      hotelOptions: [{ hotelMekkah: "Swissotel Maqam", hotelMadinah: "Anwar Al Madinah" }],
      kuota: 50, terisi: 0, status: "preparing", hargaPaket: 32000000,
      maskapaiId: airlines.sv.id,
      hotelMekkahId: hotels.swiss.id,
      hotelMadinahId: hotels.anwar.id,
      startingPointId: cities.cgk.id,
      packageTypeId: packageTypes.reg.id,
    }}),
    prisma.keberangkatan.create({ data: {
      kode: "KBR-1447-002", namaPaket: "Umroh Plus — Safar 1447H",
      tanggalBerangkat: new Date("2026-08-20"), tanggalPulang: new Date("2026-09-05"),
      maskapai: "Garuda Indonesia", nomorPenerbangan: "GA-900",
      hotelMekkah: "Hyatt Regency", hotelMadinah: "Dallah Taibah",
      hotelOptions: [{ hotelMekkah: "Hyatt Regency", hotelMadinah: "Dallah Taibah" }],
      kuota: 45, terisi: 0, status: "preparing", hargaPaket: 38000000,
      maskapaiId: airlines.ga.id,
      hotelMekkahId: hotels.hyatt.id,
      hotelMadinahId: hotels.dallah.id,
      startingPointId: cities.cgk.id,
      packageTypeId: packageTypes.plt.id,
    }}),
    prisma.keberangkatan.create({ data: {
      kode: "KBR-1447-003", namaPaket: "Umroh Ekonomi — Rabiul Awal 1447H",
      tanggalBerangkat: new Date("2026-09-10"), tanggalPulang: new Date("2026-09-25"),
      maskapai: "Lion Air", nomorPenerbangan: "JT-300",
      hotelMekkah: "Midan Hotel", hotelMadinah: "Al Eiman Royal",
      hotelOptions: [{ hotelMekkah: "Midan Hotel", hotelMadinah: "Al Eiman Royal" }],
      kuota: 60, terisi: 0, status: "preparing", hargaPaket: 25500000,
      maskapaiId: airlines.jt.id,
      hotelMekkahId: hotels.midan.id,
      hotelMadinahId: hotels.eiman.id,
      startingPointId: cities.cgk.id,
      packageTypeId: packageTypes.reg.id,
    }}),
    prisma.keberangkatan.create({ data: {
      kode: "KBR-1447-004", namaPaket: "Umroh VIP — Rabiul Akhir 1447H",
      tanggalBerangkat: new Date("2026-10-05"), tanggalPulang: new Date("2026-10-22"),
      maskapai: "Emirates", nomorPenerbangan: "EK-400",
      hotelMekkah: "Fairmont Clock Tower", hotelMadinah: "Oberoi Madinah",
      hotelOptions: [{ hotelMekkah: "Fairmont Clock Tower", hotelMadinah: "Oberoi Madinah" }],
      kuota: 30, terisi: 0, status: "preparing", hargaPaket: 55000000,
      maskapaiId: airlines.ek.id,
      hotelMekkahId: hotels.fairmont.id,
      hotelMadinahId: hotels.oberoi.id,
      startingPointId: cities.cgk.id,
      packageTypeId: packageTypes.ram.id,
    }}),
    prisma.keberangkatan.create({ data: {
      kode: "KBR-1447-005", namaPaket: "Umroh Akbar — Jumadil Awal 1447H",
      tanggalBerangkat: new Date("2026-11-15"), tanggalPulang: new Date("2026-12-02"),
      maskapai: "Qatar Airways", nomorPenerbangan: "QR-700",
      hotelMekkah: "Hilton Convention", hotelMadinah: "Pullman Zamzam",
      hotelOptions: [{ hotelMekkah: "Hilton Convention", hotelMadinah: "Pullman Zamzam" }],
      kuota: 55, terisi: 0, status: "preparing", hargaPaket: 42000000,
      maskapaiId: airlines.qr.id,
      hotelMekkahId: hotels.hilton.id,
      hotelMadinahId: hotels.pullman.id,
      startingPointId: cities.cgk.id,
      packageTypeId: packageTypes.syw.id,
    }}),
  ]);
  console.log(`✅ Created ${keberangkatanList.length} keberangkatan`);

  // ── 3. Groups (12 groups across 5 keberangkatan) ────────────
  const groups: any[] = [];
  for (let i = 0; i < 12; i++) {
    const kbr = keberangkatanList[i % 5]!;
    const group = await prisma.registrationGroup.create({
      data: {
        kodeRegistrasi: `REG-${String(i + 1).padStart(3, "0")}`,
        namaGroup: `Group ${i + 1} — ${pick(NAMA_DEPAN)}`,
        paketKeberangkatanId: kbr.id,
        ketuaGroupId: "", // will be updated after jamaah creation
        jumlahAnggota: 0,
        totalTagihan: 0,
        sisaPembayaran: 0,
        status: pick(["active", "active", "active", "active", "completed"]),
      },
    });
    groups.push(group);
  }
  console.log(`✅ Created ${groups.length} registration groups`);

  // ── 4. Jamaah (110 across 12 groups) ────────────────────────
  const jamaahList: any[] = [];
  const statusOptions = ["registered", "dokumen_upload", "dokumen_verified", "pembayaran_pending", "lunas", "ready"];

  for (let i = 0; i < 110; i++) {
    const group = groups[i % 12];
    const namaDepan = pick(NAMA_DEPAN);
    const namaBelakang = pick(NAMA_BELAKANG);
    const jk = i % 3 === 0 ? "P" : "L";
    const status = pick(statusOptions);
    const kota = pick(KOTA);
    const tglLahir = randomDate(60 * 365, 18 * 365);

    const jamaah = await prisma.jamaah.create({
      data: {
        groupId: group.id,
        registrationId: `J-${String(i + 1).padStart(4, "0")}`,
        nomorPeserta: `PST-${String(i + 1).padStart(5, "0")}`,
        namaLengkap: `${namaDepan} ${namaBelakang}`,
        namaAyah: pick(NAMA_DEPAN),
        jenisKelamin: jk,
        tempatLahir: kota,
        tanggalLahir: tglLahir,
        nik: String(rand(1000000000000000, 9999999999999999)),
        nomorPaspor: String.fromCharCode(65 + rand(0, 25)) + String(rand(100000, 999999)),
        masaBerlakuPaspor: new Date(NOW.getTime() + rand(365, 1825) * 86400000),
        nomorTelepon: `08${rand(100000000, 999999999)}`,
        email: `${namaDepan.toLowerCase()}.${namaBelakang.toLowerCase()}${i}@email.com`,
        alamat: `Jl. ${pick(NAMA_BELAKANG)} No. ${rand(1, 200)}`,
        provinsi: pick(["DKI Jakarta", "Jawa Barat", "Jawa Timur", "Banten", "Jawa Tengah"]),
        kota,
        kecamatan: pick(["Cilandak", "Cibiru", "Sukmajaya", "Menteng", "Tambora"]),
        kelurahan: pick(["Kelurahan A", "Kelurahan B", "Kelurahan C"]),
        hotelMekkah: "Swissotel Maqam",
        hotelMadinah: "Anwar Al Madinah",
        status: status as any,
        createdAt: randomDate(180, 1),
      },
    });
    jamaahList.push(jamaah);

    // Update group total
    await prisma.registrationGroup.update({ where: { id: group.id }, data: { jumlahAnggota: { increment: 1 } } });
  }
  console.log(`✅ Created ${jamaahList.length} jamaah`);

  // ── 5. Dokumen (per jamaah) ─────────────────────────────────
  let dokumenCount = 0;
  for (const j of jamaahList) {
    for (const jenis of DOKUMEN_TYPES) {
      const isWajib = WAJIB_DOKUMEN.includes(jenis);
      const hasUploaded = Math.random() > (isWajib ? 0.15 : 0.5);
      const status = hasUploaded ? pick(["pending", "processing", "verified", "lengkap"]) : "pending";

      await prisma.dokumenItem.create({
        data: {
          jamaahId: j.id,
          jenis,
          wajib: isWajib,
          status: status as any,
          fileUrl: hasUploaded ? `/storage/dokumen/${j.id}/${jenis}.jpg` : null,
          uploadedAt: hasUploaded ? randomDate(90, 1) : null,
        },
      });
      dokumenCount++;
    }
  }
  console.log(`✅ Created ${dokumenCount} dokumen items`);

  // ── 6. Invoices (dp/pelunasan/tambahan per group) ──────────
  let invoiceCount = 0;
  for (const group of groups) {
    const kbr = keberangkatanList.find((k: any) => k.id === group.paketKeberangkatanId)!;
    const basePrice = kbr.hargaPaket;
    const jamaahInGroup = jamaahList.filter((j: any) => j.groupId === group.id);
    const totalJamaah = jamaahInGroup.length;

    // Invoice DP 40%
    await prisma.invoice.create({
      data: {
        groupId: group.id,
        nomorInvoice: `INV-DP-${group.kodeRegistrasi}`,
        tipe: "dp",
        jumlah: Math.round(basePrice * totalJamaah * 0.4),
        sisaTagihan: Math.round(basePrice * totalJamaah * 0.4 * (Math.random() > 0.3 ? 0 : 0.5)),
        status: pick(["paid", "unpaid", "unpaid"]),
        jatuhTempo: new Date(NOW.getTime() + rand(-14, 30) * 86400000),
      },
    });
    invoiceCount++;

    // Invoice Pelunasan 40%
    await prisma.invoice.create({
      data: {
        groupId: group.id,
        nomorInvoice: `INV-LNS-${group.kodeRegistrasi}`,
        tipe: "pelunasan",
        jumlah: Math.round(basePrice * totalJamaah * 0.4),
        sisaTagihan: Math.round(basePrice * totalJamaah * 0.4 * 0.7),
        status: "unpaid",
        jatuhTempo: new Date(NOW.getTime() + rand(30, 60) * 86400000),
      },
    });
    invoiceCount++;

    // Invoice Tambahan 20%
    await prisma.invoice.create({
      data: {
        groupId: group.id,
        nomorInvoice: `INV-TBH-${group.kodeRegistrasi}`,
        tipe: "tambahan",
        jumlah: Math.round(basePrice * totalJamaah * 0.2),
        sisaTagihan: Math.round(basePrice * totalJamaah * 0.2),
        status: "unpaid",
        jatuhTempo: new Date(NOW.getTime() + rand(45, 75) * 86400000),
      },
    });
    invoiceCount++;
  }
  console.log(`✅ Created ${invoiceCount} invoices`);

  // ── 7. Pembayaran ───────────────────────────────────────────
  let paymentCount = 0;
  const invoices = await prisma.invoice.findMany();
  for (const inv of invoices) {
    if (inv.status === "unpaid" || inv.status === "partial" || inv.sisaTagihan < inv.jumlah) {
      const jumlahBayar = Math.round(inv.jumlah * (0.1 + Math.random() * 0.5));
      await prisma.pembayaran.create({
        data: {
          invoiceId: inv.id,
          groupId: inv.groupId,
          jumlah: Math.min(jumlahBayar, inv.sisaTagihan),
          status: Math.random() > 0.2 ? "verified" : "pending",
          metode: pick(["transfer", "cash", "virtual_account"]),
          sumber: "admin",
          tanggal: randomDate(60, 1),
          verifiedBy: Math.random() > 0.2 ? "Admin Pembayaran" : null,
        },
      });
      paymentCount++;
    }
  }
  console.log(`✅ Created ${paymentCount} payments`);

  // ── 8. Manifests (5 packages x 3 formats each) ──────────────
  let manifestCount = 0;
  for (const kbr of keberangkatanList) {
    for (const format of ["siskohat", "visa", "blockseat"]) {
      const groupForKbr = groups.filter((g: any) => g.paketKeberangkatanId === kbr.id);
      const jamaahForKbr = jamaahList.filter((j: any) => groupForKbr.some((g: any) => g.id === j.groupId));

      const manifest = await prisma.manifest.create({
        data: {
          keberangkatanId: kbr.id,
          kode: `MAN/${kbr.kode}/${format.toUpperCase()}`,
          namaManifest: `manifest-${format}-${kbr.namaPaket.replace(/\s+/g, "-").toLowerCase()}.pdf`,
          status: format === "siskohat" ? "final" : "draft",
        },
      });
      manifestCount++;

      // Manifest rows
      for (let idx = 0; idx < jamaahForKbr.length; idx++) {
        const j = jamaahForKbr[idx];
        await prisma.manifestRow.create({
          data: {
            manifestId: manifest.id,
            jamaahId: j.id,
            nomorUrut: idx + 1,
            nomorPaspor: j.nomorPaspor,
            namaLengkap: j.namaLengkap,
            tempatLahir: j.tempatLahir,
            tanggalLahir: String(j.tanggalLahir instanceof Date ? j.tanggalLahir.toISOString().split("T")[0] : j.tanggalLahir),
            nomorKursi: `${rand(1, 45)}${pick(["A", "B", "C", "D", "E", "F"])}`,
          },
        });
      }
    }
  }
  console.log(`✅ Created ${manifestCount} manifests`);

  // ── 9. Rooming ──────────────────────────────────────────────
  let roomingCount = 0;
  for (const kbr of keberangkatanList) {
    for (const lokasi of ["makkah", "madinah"]) {
      const hotelName = lokasi === "makkah" ? kbr.hotelMekkah : kbr.hotelMadinah;
      const rooming = await prisma.rooming.create({
        data: {
          keberangkatanId: kbr.id,
          hotelMekkah: kbr.hotelMekkah,
          hotelMadinah: kbr.hotelMadinah,
          hotelNama: `${hotelName} — ${lokasi === "makkah" ? "Makkah" : "Madinah"}`,
          status: "draft",
        },
      });
      roomingCount++;

      // Kamar + penghuni
      const groupForKbr = groups.filter((g: any) => g.paketKeberangkatanId === kbr.id);
      const jamaahForKbr = jamaahList.filter((j: any) => groupForKbr.some((g: any) => g.id === j.groupId));

      // Assign to quad/double rooms
      const roomSize = lokasi === "makkah" ? 4 : 2;
      for (let roomIdx = 0; roomIdx < Math.ceil(jamaahForKbr.length / roomSize); roomIdx++) {
        const kamar = await prisma.kamar.create({
          data: {
            roomingId: rooming.id,
            nomorKamar: `${rand(100, 999)}`,
            tipe: roomSize === 4 ? "quad" : "double",
            lantai: rand(1, 20),
          },
        });

        const penghuniRoom = jamaahForKbr.slice(roomIdx * roomSize, (roomIdx + 1) * roomSize);
        for (const p of penghuniRoom) {
          await prisma.penghuniKamar.create({
            data: {
              kamarId: kamar.id,
              jamaahId: p.id,
              namaLengkap: p.namaLengkap,
              jenisKelamin: p.jenisKelamin,
            },
          });
        }
      }
    }
  }
  console.log(`✅ Created ${roomingCount} roomings`);

  // ── 10. Reminders ───────────────────────────────────────────
  let reminderCount = 0;
  const overdueInvoices = invoices.filter((inv: any) => inv.jatuhTempo && new Date(inv.jatuhTempo) < NOW && inv.status !== "paid");
  for (const inv of overdueInvoices.slice(0, 15)) {
    await prisma.reminder.create({
      data: {
        invoiceId: inv.id,
        groupId: inv.groupId,
        tipe: inv.tipe === "dp" ? "pembayaran" : pick(["pembayaran", "dokumen"]),
        pesan: `Reminder untuk invoice ${inv.nomorInvoice}`,
        dikirimPada: randomDate(14, 1),
        status: pick(["sent", "read", "responded"]),
      },
    });
    reminderCount++;
  }
  console.log(`✅ Created ${reminderCount} reminders`);

  // ── 11. Notifications ───────────────────────────────────────
  for (const u of users.slice(0, 4)) {
    for (let n = 0; n < rand(3, 10); n++) {
      await prisma.notification.create({
        data: {
          userId: u.id,
          type: pick(["info", "warning", "success", "error"]),
          category: pick(["dokumen", "pembayaran", "manifest"]),
          title: pick([
            "Pembayaran diterima", "Dokumen perlu revisi", "Manifest siap final",
            "Reminder jatuh tempo", "Jamaah baru terdaftar", "Invoice diterbitkan",
          ]),
          message: `Notifikasi otomatis #${n + 1} untuk ${u.name}`,
          read: Math.random() > 0.5,
          createdAt: randomDate(30, 0),
        },
      });
    }
  }
  console.log("✅ Created notifications");

  // ── 12. Audit log ───────────────────────────────────────────
  const auditActions = ["create", "update", "approve", "reject", "delete", "export"];
  const auditModules = ["dokumen", "pembayaran", "manifest", "rooming", "keberangkatan", "jamaah", "sistem"];
  for (let a = 0; a < 50; a++) {
    const user = pick(users);
    await prisma.auditEntry.create({
      data: {
        userId: user.id,
        userName: user.name,
        role: user.role as any,
        module: pick(auditModules) as any,
        action: pick(auditActions),
        entityId: `entity-${rand(1, 110)}`,
        entityType: pick(["jamaah", "invoice", "manifest", "dokumen", "pembayaran"]),
        detail: `Automated seed entry ${a + 1}`,
        timestamp: randomDate(90, 0),
      },
    });
  }
  console.log("✅ Created audit log entries\n");

  // ── Summary ─────────────────────────────────────────────────
  const totalJamaah = await prisma.jamaah.count();
  const totalGroups = await prisma.registrationGroup.count();
  const totalInvoices = await prisma.invoice.count();
  const totalPayments = await prisma.pembayaran.count();
  const totalManifests = await prisma.manifest.count();
  const totalRoomings = await prisma.rooming.count();
  const totalDokumen = await prisma.dokumenItem.count();
  const pendingDokumen = await prisma.dokumenItem.count({ where: { status: "pending" } });
  const verifiedDokumen = await prisma.dokumenItem.count({ where: { status: { in: ["verified", "lengkap"] } } });

  console.log("==================================================");
  console.log("🌱 SEED DEV COMPLETE");
  console.log("==================================================");
  console.log(`  Jamaah:        ${totalJamaah}`);
  console.log(`  Groups:        ${totalGroups}`);
  console.log(`  Keberangkatan: ${keberangkatanList.length}`);
  console.log(`  Invoices:      ${totalInvoices}`);
  console.log(`  Payments:      ${totalPayments}`);
  console.log(`  Manifests:     ${totalManifests}`);
  console.log(`  Roomings:      ${totalRoomings}`);
  console.log(`  Dokumen:       ${totalDokumen} (${pendingDokumen} pending, ${verifiedDokumen} verified)`);
  console.log(`  Users:         ${users.length}`);
  console.log(`  Reminders:     ${reminderCount}`);
  console.log("==================================================");
  console.log("\nLogin credentials (all roles): password = admin123");
  console.log("  admin@vtu.id       — Super Admin");
  console.log("  ops@vtu.id         — Admin Operasional");
  console.log("  finance@vtu.id     — Admin Pembayaran");
  console.log("  manifest@vtu.id    — Admin Manifest");
  console.log("  dokumen@vtu.id     — Admin Dokumen");
  console.log("==================================================\n");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
