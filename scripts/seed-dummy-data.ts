import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting Dummy Data Seeding for VTU Operational System...");

  // 1. MASTER AIRLINES
  console.log("✈️ Seeding Master Airlines...");
  const airlinePlt = await prisma.masterAirline.upsert({
    where: { code: "PLT-DUMMY" },
    update: { name: "[DUMMY] Pelita Air" },
    create: {
      id: "DUMMY-AIRLINE-PLT",
      code: "PLT-DUMMY",
      name: "[DUMMY] Pelita Air",
      isActive: true,
    },
  });

  const airlineSv = await prisma.masterAirline.upsert({
    where: { code: "SV-DUMMY" },
    update: { name: "[DUMMY] Saudia Airlines" },
    create: {
      id: "DUMMY-AIRLINE-SV",
      code: "SV-DUMMY",
      name: "[DUMMY] Saudia Airlines",
      isActive: true,
    },
  });

  // 2. MASTER CITIES & HOTEL CITIES
  console.log("🏙️ Seeding Master Cities...");
  const citySub = await prisma.masterCity.upsert({
    where: { code: "SUB-DUMMY" },
    update: { name: "[DUMMY] Surabaya (SUB)", country: "Indonesia" },
    create: {
      id: "DUMMY-CITY-SUB",
      code: "SUB-DUMMY",
      name: "[DUMMY] Surabaya (SUB)",
      country: "Indonesia",
      isActive: true,
    },
  });

  const cityJkt = await prisma.masterCity.upsert({
    where: { code: "JKT-DUMMY" },
    update: { name: "[DUMMY] Jakarta (CGK)", country: "Indonesia" },
    create: {
      id: "DUMMY-CITY-JKT",
      code: "JKT-DUMMY",
      name: "[DUMMY] Jakarta (CGK)",
      country: "Indonesia",
      isActive: true,
    },
  });

  const hotelCityMek = await prisma.masterHotelCity.upsert({
    where: { code: "MEK-DUMMY" },
    update: { name: "[DUMMY] Mekkah" },
    create: {
      id: "DUMMY-HCITY-MEK",
      code: "MEK-DUMMY",
      name: "[DUMMY] Mekkah",
      isActive: true,
    },
  });

  const hotelCityMed = await prisma.masterHotelCity.upsert({
    where: { code: "MED-DUMMY" },
    update: { name: "[DUMMY] Madinah" },
    create: {
      id: "DUMMY-HCITY-MED",
      code: "MED-DUMMY",
      name: "[DUMMY] Madinah",
      isActive: true,
    },
  });

  // 3. MASTER HOTELS
  console.log("🏨 Seeding Master Hotels...");
  const hotelMek1 = await prisma.masterHotel.upsert({
    where: { code: "HOTEL-MK1-DUMMY" },
    update: { name: "[DUMMY] Safwah Tower (Mekkah)" },
    create: {
      id: "DUMMY-HOTEL-MK1",
      code: "HOTEL-MK1-DUMMY",
      cityId: hotelCityMek.id,
      name: "[DUMMY] Safwah Tower (Mekkah)",
      starRating: 5,
      isActive: true,
    },
  });

  const hotelMek2 = await prisma.masterHotel.upsert({
    where: { code: "HOTEL-MK2-DUMMY" },
    update: { name: "[DUMMY] Pullman Zamzam (Mekkah)" },
    create: {
      id: "DUMMY-HOTEL-MK2",
      code: "HOTEL-MK2-DUMMY",
      cityId: hotelCityMek.id,
      name: "[DUMMY] Pullman Zamzam (Mekkah)",
      starRating: 5,
      isActive: true,
    },
  });

  const hotelMed1 = await prisma.masterHotel.upsert({
    where: { code: "HOTEL-MD1-DUMMY" },
    update: { name: "[DUMMY] Taiba Front (Madinah)" },
    create: {
      id: "DUMMY-HOTEL-MD1",
      code: "HOTEL-MD1-DUMMY",
      cityId: hotelCityMed.id,
      name: "[DUMMY] Taiba Front (Madinah)",
      starRating: 5,
      isActive: true,
    },
  });

  const hotelMed2 = await prisma.masterHotel.upsert({
    where: { code: "HOTEL-MD2-DUMMY" },
    update: { name: "[DUMMY] Hotel Al Aqeeq (Madinah)" },
    create: {
      id: "DUMMY-HOTEL-MD2",
      code: "HOTEL-MD2-DUMMY",
      cityId: hotelCityMed.id,
      name: "[DUMMY] Hotel Al Aqeeq (Madinah)",
      starRating: 4,
      isActive: true,
    },
  });

  // 4. MASTER PACKAGE TYPES
  console.log("📦 Seeding Master Package Types...");
  const pkgTypeReg = await prisma.masterPackageType.upsert({
    where: { code: "REG-DUMMY" },
    update: { name: "[DUMMY] Paket Umroh Reguler" },
    create: {
      id: "DUMMY-PKGTYPE-REG",
      code: "REG-DUMMY",
      name: "[DUMMY] Paket Umroh Reguler",
      isActive: true,
    },
  });

  const pkgTypeVip = await prisma.masterPackageType.upsert({
    where: { code: "VIP-DUMMY" },
    update: { name: "[DUMMY] Paket Umroh VIP Klaster" },
    create: {
      id: "DUMMY-PKGTYPE-VIP",
      code: "VIP-DUMMY",
      name: "[DUMMY] Paket Umroh VIP Klaster",
      isActive: true,
    },
  });

  // 5. MASTER ROUTES
  console.log("🗺️ Seeding Master Routes...");
  await prisma.masterRoute.upsert({
    where: { kode: "RUTE-SUB-JED-DUMMY" },
    update: { ruteIn: "Surabaya (SUB)", ruteOut: "Jeddah / Madinah" },
    create: {
      id: "DUMMY-ROUTE-1",
      kode: "RUTE-SUB-JED-DUMMY",
      ruteIn: "Surabaya (SUB)",
      ruteOut: "Jeddah / Madinah",
      isActive: true,
    },
  });

  // 6. KEBERANGKATAN (DEPARTURE PACKAGES)
  console.log("🕋 Seeding Keberangkatan (Departure Packages)...");
  
  const keb1 = await prisma.keberangkatan.upsert({
    where: { kode: "#2026_12H_SBY_GA_OCT10_DUMMY" },
    update: { namaPaket: "[DUMMY] PAKET REGULER UMROH 12 H SBY (JED.C-M) - 10 OKTOBER 2026" },
    create: {
      id: "DUMMY-KEB-2026-OCT",
      kode: "#2026_12H_SBY_GA_OCT10_DUMMY",
      namaPaket: "[DUMMY] PAKET REGULER UMROH 12 H SBY (JED.C-M) - 10 OKTOBER 2026",
      hargaPaket: 35000000,
      tanggalBerangkat: new Date("2026-10-10T00:00:00Z"),
      tanggalPulang: new Date("2026-10-21T00:00:00Z"),
      maskapai: "[DUMMY] Pelita Air",
      maskapaiId: airlinePlt.id,
      nomorPenerbangan: "PLT-816",
      hotelMekkah: "[DUMMY] Safwah Tower (Mekkah)",
      hotelMekkahId: hotelMek1.id,
      hotelMadinah: "[DUMMY] Taiba Front (Madinah)",
      hotelMadinahId: hotelMed1.id,
      startingPointId: citySub.id,
      packageTypeId: pkgTypeReg.id,
      durationDays: 12,
      kuota: 45,
      maxSeat: 45,
      terisi: 3,
      status: "scheduled",
      hotelOptions: [
        {
          clusterId: "K1",
          clusterName: "Bronze",
          hotelMekkah: "[DUMMY] Grand Al Massa",
          hotelMadinah: "[DUMMY] Durrat Al Eiman",
          hargaBase: 35000000,
          upgradeDouble: 4000000,
          upgradeTriple: 2500000,
        },
        {
          clusterId: "K2",
          clusterName: "Silver",
          hotelMekkah: "[DUMMY] Safwah Tower",
          hotelMadinah: "[DUMMY] Taiba Front",
          hargaBase: 40400000,
          upgradeDouble: 5000000,
          upgradeTriple: 3500000,
        },
      ],
    },
  });

  const keb2 = await prisma.keberangkatan.upsert({
    where: { kode: "#2026_9H_JKT_SV_NOV15_DUMMY" },
    update: { namaPaket: "[DUMMY] PAKET VIP UMROH 9 H JKT (JED.C-M) - 15 NOVEMBER 2026" },
    create: {
      id: "DUMMY-KEB-2026-NOV",
      kode: "#2026_9H_JKT_SV_NOV15_DUMMY",
      namaPaket: "[DUMMY] PAKET VIP UMROH 9 H JKT (JED.C-M) - 15 NOVEMBER 2026",
      hargaPaket: 46400000,
      tanggalBerangkat: new Date("2026-11-15T00:00:00Z"),
      tanggalPulang: new Date("2026-11-23T00:00:00Z"),
      maskapai: "[DUMMY] Saudia Airlines",
      maskapaiId: airlineSv.id,
      nomorPenerbangan: "SV-816",
      hotelMekkah: "[DUMMY] Pullman Zamzam (Mekkah)",
      hotelMekkahId: hotelMek2.id,
      hotelMadinah: "[DUMMY] Hotel Al Aqeeq (Madinah)",
      hotelMadinahId: hotelMed2.id,
      startingPointId: cityJkt.id,
      packageTypeId: pkgTypeVip.id,
      durationDays: 9,
      kuota: 30,
      maxSeat: 30,
      terisi: 2,
      status: "scheduled",
      hotelOptions: [
        {
          clusterId: "K3",
          clusterName: "Gold",
          hotelMekkah: "[DUMMY] Pullman Zamzam",
          hotelMadinah: "[DUMMY] Hotel Al Aqeeq",
          hargaBase: 42400000,
          upgradeDouble: 4500000,
          upgradeTriple: 3000000,
        },
        {
          clusterId: "K4",
          clusterName: "Platinum",
          hotelMekkah: "[DUMMY] Safwah Tower",
          hotelMadinah: "[DUMMY] Taiba Front",
          hargaBase: 46400000,
          upgradeDouble: 5500000,
          upgradeTriple: 3500000,
        },
      ],
    },
  });

  // 7. REGISTRATION GROUPS & JAMAAH
  console.log("👥 Seeding Registration Groups & Jamaah...");

  // Group 1
  const grp1 = await prisma.registrationGroup.upsert({
    where: { kodeRegistrasi: "GRP-DUMMY-2026-001" },
    update: { namaGroup: "DUMMY - Kel. H. Ahmad Syahputra" },
    create: {
      id: "DUMMY-GRP-001",
      kodeRegistrasi: "GRP-DUMMY-2026-001",
      namaGroup: "DUMMY - Kel. H. Ahmad Syahputra",
      ketuaGroupId: "DUMMY-JAMAAH-01",
      paketKeberangkatanId: keb1.id,
      jumlahAnggota: 3,
      totalTagihan: 105000000,
      totalPembayaran: 70000000,
      sisaPembayaran: 35000000,
      status: "active",
    },
  });

  // Jamaah 1 (Ketua Group 1)
  const j1 = await prisma.jamaah.upsert({
    where: { registrationId: "GRP-DUMMY-2026-001-1" },
    update: { namaLengkap: "H. Ahmad Syahputra (Dummy)" },
    create: {
      id: "DUMMY-JAMAAH-01",
      registrationId: "GRP-DUMMY-2026-001-1",
      groupId: grp1.id,
      nomorPeserta: "JM-DUMMY-001",
      namaLengkap: "H. Ahmad Syahputra (Dummy)",
      namaAyah: "H. Syahputra",
      jenisKelamin: "L",
      tempatLahir: "Surabaya",
      tanggalLahir: new Date("1975-05-12T00:00:00Z"),
      nik: "3578011205750001",
      nomorPaspor: "A12345678",
      masaBerlakuPaspor: new Date("2030-05-12T00:00:00Z"),
      nomorTelepon: "081234567890",
      email: "ahmad.syahputra@example.com",
      alamat: "Jl. Darmo No. 10",
      provinsi: "Jawa Timur",
      kota: "Surabaya",
      kecamatan: "Tegalsari",
      kelurahan: "DR. Soetomo",
      syaratDisetujui: true,
      status: "lunas",
      hotelMekkah: "[DUMMY] Safwah Tower",
      hotelMadinah: "[DUMMY] Taiba Front",
    },
  });

  // Jamaah 2 (Anggota Group 1)
  const j2 = await prisma.jamaah.upsert({
    where: { registrationId: "GRP-DUMMY-2026-001-2" },
    update: { namaLengkap: "Hj. Siti Aminah (Dummy)" },
    create: {
      id: "DUMMY-JAMAAH-02",
      registrationId: "GRP-DUMMY-2026-001-2",
      groupId: grp1.id,
      nomorPeserta: "JM-DUMMY-002",
      namaLengkap: "Hj. Siti Aminah (Dummy)",
      namaAyah: "H. Abdullah",
      jenisKelamin: "P",
      tempatLahir: "Surabaya",
      tanggalLahir: new Date("1978-08-20T00:00:00Z"),
      nik: "3578012008780002",
      nomorPaspor: "A87654321",
      masaBerlakuPaspor: new Date("2029-08-20T00:00:00Z"),
      nomorTelepon: "081234567891",
      email: "siti.aminah@example.com",
      alamat: "Jl. Darmo No. 10",
      provinsi: "Jawa Timur",
      kota: "Surabaya",
      kecamatan: "Tegalsari",
      kelurahan: "DR. Soetomo",
      syaratDisetujui: true,
      status: "dokumen_upload",
      hotelMekkah: "[DUMMY] Safwah Tower",
      hotelMadinah: "[DUMMY] Taiba Front",
    },
  });

  // Jamaah 3 (Anggota Group 1)
  const j3 = await prisma.jamaah.upsert({
    where: { registrationId: "GRP-DUMMY-2026-001-3" },
    update: { namaLengkap: "Muhammad Rizky (Dummy)" },
    create: {
      id: "DUMMY-JAMAAH-03",
      registrationId: "GRP-DUMMY-2026-001-3",
      groupId: grp1.id,
      nomorPeserta: "JM-DUMMY-003",
      namaLengkap: "Muhammad Rizky (Dummy)",
      namaAyah: "H. Ahmad Syahputra",
      jenisKelamin: "L",
      tempatLahir: "Surabaya",
      tanggalLahir: new Date("2002-01-15T00:00:00Z"),
      nik: "3578011501020003",
      nomorPaspor: "A11223344",
      masaBerlakuPaspor: new Date("2031-01-15T00:00:00Z"),
      nomorTelepon: "081234567892",
      email: "rizky@example.com",
      alamat: "Jl. Darmo No. 10",
      provinsi: "Jawa Timur",
      kota: "Surabaya",
      kecamatan: "Tegalsari",
      kelurahan: "DR. Soetomo",
      syaratDisetujui: true,
      status: "registered",
      hotelMekkah: "[DUMMY] Safwah Tower",
      hotelMadinah: "[DUMMY] Taiba Front",
    },
  });

  // Group 2
  const grp2 = await prisma.registrationGroup.upsert({
    where: { kodeRegistrasi: "GRP-DUMMY-2026-002" },
    update: { namaGroup: "DUMMY - Rombongan Bpk. Budi Santoso" },
    create: {
      id: "DUMMY-GRP-002",
      kodeRegistrasi: "GRP-DUMMY-2026-002",
      namaGroup: "DUMMY - Rombongan Bpk. Budi Santoso",
      ketuaGroupId: "DUMMY-JAMAAH-04",
      paketKeberangkatanId: keb2.id,
      jumlahAnggota: 2,
      totalTagihan: 92800000,
      totalPembayaran: 92800000,
      sisaPembayaran: 0,
      status: "active",
    },
  });

  // Jamaah 4 (Ketua Group 2)
  const j4 = await prisma.jamaah.upsert({
    where: { registrationId: "GRP-DUMMY-2026-002-1" },
    update: { namaLengkap: "Budi Santoso (Dummy)" },
    create: {
      id: "DUMMY-JAMAAH-04",
      registrationId: "GRP-DUMMY-2026-002-1",
      groupId: grp2.id,
      nomorPeserta: "JM-DUMMY-004",
      namaLengkap: "Budi Santoso (Dummy)",
      namaAyah: "Santoso",
      jenisKelamin: "L",
      tempatLahir: "Jakarta",
      tanggalLahir: new Date("1980-03-10T00:00:00Z"),
      nik: "3171011003800004",
      nomorPaspor: "B99887766",
      masaBerlakuPaspor: new Date("2030-03-10T00:00:00Z"),
      nomorTelepon: "081987654321",
      email: "budi.santoso@example.com",
      alamat: "Jl. Sudirman No. 45",
      provinsi: "DKI Jakarta",
      kota: "Jakarta Selatan",
      kecamatan: "Kebayoran Baru",
      kelurahan: "Senayan",
      syaratDisetujui: true,
      status: "pembayaran_pending",
      hotelMekkah: "[DUMMY] Pullman Zamzam",
      hotelMadinah: "[DUMMY] Hotel Al Aqeeq",
    },
  });

  // Jamaah 5 (Anggota Group 2)
  await prisma.jamaah.upsert({
    where: { registrationId: "GRP-DUMMY-2026-002-2" },
    update: { namaLengkap: "Fatimah Azzahra (Dummy)" },
    create: {
      id: "DUMMY-JAMAAH-05",
      registrationId: "GRP-DUMMY-2026-002-2",
      groupId: grp2.id,
      nomorPeserta: "JM-DUMMY-005",
      namaLengkap: "Fatimah Azzahra (Dummy)",
      namaAyah: "Budi Santoso",
      jenisKelamin: "P",
      tempatLahir: "Jakarta",
      tanggalLahir: new Date("2005-09-25T00:00:00Z"),
      nik: "3171012509050005",
      nomorPaspor: "B55443322",
      masaBerlakuPaspor: new Date("2032-09-25T00:00:00Z"),
      nomorTelepon: "081987654322",
      email: "fatimah@example.com",
      alamat: "Jl. Sudirman No. 45",
      provinsi: "DKI Jakarta",
      kota: "Jakarta Selatan",
      kecamatan: "Kebayoran Baru",
      kelurahan: "Senayan",
      syaratDisetujui: true,
      status: "lunas",
      hotelMekkah: "[DUMMY] Pullman Zamzam",
      hotelMadinah: "[DUMMY] Hotel Al Aqeeq",
    },
  });

  // 8. DOKUMEN ITEMS FOR JAMAAH
  console.log("📄 Seeding Dokumen Items...");

  // Dokumen for Jamaah 1 (All Verified)
  await prisma.dokumenItem.createMany({
    data: [
      { id: "DUMMY-DOC-01-PASPOR", jamaahId: j1.id, jenis: "paspor", wajib: true, status: "verified", fileUrl: "https://example.com/dummy-paspor-1.jpg" },
      { id: "DUMMY-DOC-01-KTP", jamaahId: j1.id, jenis: "ktp", wajib: true, status: "verified", fileUrl: "https://example.com/dummy-ktp-1.jpg" },
      { id: "DUMMY-DOC-01-VAKSIN", jamaahId: j1.id, jenis: "vaksin", wajib: true, status: "verified", fileUrl: "https://example.com/dummy-vaksin-1.jpg" },
      { id: "DUMMY-DOC-01-FOTO", jamaahId: j1.id, jenis: "pas_foto", wajib: true, status: "verified", fileUrl: "https://example.com/dummy-foto-1.jpg" },
    ],
    skipDuplicates: true,
  });

  // Dokumen for Jamaah 2 (Incomplete / Pending for testing)
  await prisma.dokumenItem.createMany({
    data: [
      { id: "DUMMY-DOC-02-PASPOR", jamaahId: j2.id, jenis: "paspor", wajib: true, status: "pending", fileUrl: null, catatan: "Mohon upload paspor jelas" },
      { id: "DUMMY-DOC-02-KTP", jamaahId: j2.id, jenis: "ktp", wajib: true, status: "verified", fileUrl: "https://example.com/dummy-ktp-2.jpg" },
      { id: "DUMMY-DOC-02-VAKSIN", jamaahId: j2.id, jenis: "vaksin", wajib: true, status: "kurang", fileUrl: null, catatan: "Sertifikat meningitis belum diserahkan" },
    ],
    skipDuplicates: true,
  });

  // Dokumen for Jamaah 4 (Verified)
  await prisma.dokumenItem.createMany({
    data: [
      { id: "DUMMY-DOC-04-PASPOR", jamaahId: j4.id, jenis: "paspor", wajib: true, status: "verified", fileUrl: "https://example.com/dummy-paspor-4.jpg" },
      { id: "DUMMY-DOC-04-KTP", jamaahId: j4.id, jenis: "ktp", wajib: true, status: "verified", fileUrl: "https://example.com/dummy-ktp-4.jpg" },
    ],
    skipDuplicates: true,
  });

  // 9. INVOICES & PEMBAYARAN
  console.log("💳 Seeding Invoices & Pembayaran...");

  // Invoice 1 (Group 1 - Partial)
  const inv1 = await prisma.invoice.upsert({
    where: { nomorInvoice: "INV/DUMMY/2026/001" },
    update: { status: "partial" },
    create: {
      id: "DUMMY-INV-001",
      nomorInvoice: "INV/DUMMY/2026/001",
      groupId: grp1.id,
      tipe: "pelunasan",
      jumlah: 105000000,
      sisaTagihan: 35000000,
      status: "partial",
      jatuhTempo: new Date("2026-09-25T00:00:00Z"),
    },
  });

  // Invoice 2 (Group 2 - Paid)
  const inv2 = await prisma.invoice.upsert({
    where: { nomorInvoice: "INV/DUMMY/2026/002" },
    update: { status: "paid" },
    create: {
      id: "DUMMY-INV-002",
      nomorInvoice: "INV/DUMMY/2026/002",
      groupId: grp2.id,
      tipe: "pelunasan",
      jumlah: 92800000,
      sisaTagihan: 0,
      status: "paid",
      jatuhTempo: new Date("2026-10-15T00:00:00Z"),
    },
  });

  // Pembayaran items (Including PENDING item for testing Admin Review Pembayaran `/admin/pembayaran/review`)
  await prisma.pembayaran.upsert({
    where: { id: "DUMMY-PEMB-001" },
    update: { status: "verified" },
    create: {
      id: "DUMMY-PEMB-001",
      groupId: grp1.id,
      invoiceId: inv1.id,
      jumlah: 35000000,
      metode: "transfer",
      tanggal: new Date("2026-07-01T10:00:00Z"),
      buktiUrl: "https://example.com/bukti-dummy-1.jpg",
      status: "verified",
      bankPengirim: "Bank Mandiri",
      nomorRekening: "1400012345678",
      catatan: "DP Paket Umroh",
    },
  });

  await prisma.pembayaran.upsert({
    where: { id: "DUMMY-PEMB-002" },
    update: { status: "pending" },
    create: {
      id: "DUMMY-PEMB-002",
      groupId: grp1.id,
      invoiceId: inv1.id,
      jumlah: 35000000,
      metode: "transfer",
      tanggal: new Date("2026-07-25T14:30:00Z"),
      buktiUrl: "https://example.com/bukti-dummy-2.jpg",
      status: "pending",
      bankPengirim: "BCA",
      nomorRekening: "0881234567",
      catatan: "Pembayaran Cicilan Ke-2 (Menunggu Verifikasi Admin)",
    },
  });

  await prisma.pembayaran.upsert({
    where: { id: "DUMMY-PEMB-003" },
    update: { status: "verified" },
    create: {
      id: "DUMMY-PEMB-003",
      groupId: grp2.id,
      invoiceId: inv2.id,
      jumlah: 92800000,
      metode: "transfer",
      tanggal: new Date("2026-07-10T09:15:00Z"),
      buktiUrl: "https://example.com/bukti-dummy-3.jpg",
      status: "verified",
      bankPengirim: "BNI",
      nomorRekening: "0234567891",
      catatan: "Pelunasan Paket VIP Group 2",
    },
  });

  // 10. MANIFEST
  console.log("📋 Seeding Manifest...");
  const manifest1 = await prisma.manifest.upsert({
    where: { kode: "MNF-DUMMY-2026-OCT" },
    update: { status: "draft" },
    create: {
      id: "DUMMY-MAN-001",
      kode: "MNF-DUMMY-2026-OCT",
      namaManifest: "[DUMMY] Manifest 10 Oktober 2026",
      keberangkatanId: keb1.id,
      status: "draft",
      hotelMekkah: "[DUMMY] Safwah Tower",
      hotelMadinah: "[DUMMY] Taiba Front",
    },
  });

  await prisma.manifestRow.createMany({
    data: [
      { id: "DUMMY-MANROW-01", manifestId: manifest1.id, jamaahId: j1.id, nomorUrut: 1, nomorPaspor: "A12345678", namaLengkap: "H. Ahmad Syahputra (Dummy)", tempatLahir: "Surabaya", tanggalLahir: "1975-05-12", nomorKamar: "101" },
      { id: "DUMMY-MANROW-02", manifestId: manifest1.id, jamaahId: j2.id, nomorUrut: 2, nomorPaspor: "A87654321", namaLengkap: "Hj. Siti Aminah (Dummy)", tempatLahir: "Surabaya", tanggalLahir: "1978-08-20", nomorKamar: "101" },
      { id: "DUMMY-MANROW-03", manifestId: manifest1.id, jamaahId: j3.id, nomorUrut: 3, nomorPaspor: "A11223344", namaLengkap: "Muhammad Rizky (Dummy)", tempatLahir: "Surabaya", tanggalLahir: "2002-01-15", nomorKamar: "101" },
    ],
    skipDuplicates: true,
  });

  // 11. ROOMING
  console.log("🛏️ Seeding Rooming List...");
  const rooming1 = await prisma.rooming.upsert({
    where: { id: "DUMMY-ROOMING-001" },
    update: { status: "draft" },
    create: {
      id: "DUMMY-ROOMING-001",
      keberangkatanId: keb1.id,
      hotelMekkah: "[DUMMY] Safwah Tower",
      hotelMadinah: "[DUMMY] Taiba Front",
      hotelNama: "[DUMMY] Safwah — Taiba",
      status: "draft",
    },
  });

  const kamar1 = await prisma.kamar.upsert({
    where: { id: "DUMMY-KAMAR-101" },
    update: { nomorKamar: "101" },
    create: {
      id: "DUMMY-KAMAR-101",
      roomingId: rooming1.id,
      nomorKamar: "101",
      tipe: "quad",
      lantai: 1,
      mixLabel: "Quad Mix Family 1",
    },
  });

  await prisma.penghuniKamar.createMany({
    data: [
      { id: "DUMMY-PENGHUNI-01", kamarId: kamar1.id, jamaahId: j1.id, namaLengkap: "H. Ahmad Syahputra", jenisKelamin: "L" },
      { id: "DUMMY-PENGHUNI-02", kamarId: kamar1.id, jamaahId: j2.id, namaLengkap: "Hj. Siti Aminah", jenisKelamin: "P" },
      { id: "DUMMY-PENGHUNI-03", kamarId: kamar1.id, jamaahId: j3.id, namaLengkap: "Muhammad Rizky", jenisKelamin: "L" },
    ],
    skipDuplicates: true,
  });

  // 12. BADAL UMROH & WAKAF QURAN
  console.log("🤲 Seeding Badal Umroh & Wakaf Quran...");
  await prisma.badalUmrohRegistration.upsert({
    where: { id: "DUMMY-BADAL-001" },
    update: { namaAlmarhum: "Alm. H. Syahputra bin Abdullah (Dummy)" },
    create: {
      id: "DUMMY-BADAL-001",
      namaPemohon: "H. Ahmad Syahputra (Dummy)",
      nomorWhatsapp: "081234567890",
      emailPemohon: "ahmad.syahputra@example.com",
      namaAlmarhum: "Alm. H. Syahputra bin Abdullah (Dummy)",
      jenisKelamin: "L",
      hubungan: "Orang Tua",
      paketBadal: "Standard",
      status: "Diproses",
      paymentStatus: "Lunas",
      petugasBadal: "Ust. Ahmad Al-Makki",
    },
  });

  await prisma.wakafQuranRegistration.upsert({
    where: { id: "DUMMY-WAKAF-001" },
    update: { namaPewakaf: "Hj. Siti Aminah binti Abdullah (Dummy)" },
    create: {
      id: "DUMMY-WAKAF-001",
      namaPewakaf: "Hj. Siti Aminah binti Abdullah (Dummy)",
      nomorWhatsapp: "081234567891",
      emailPewakaf: "siti.aminah@example.com",
      jumlahMushaf: 10,
      lokasiWakaf: "Masjidil Haram Makkah Al-Mukarramah",
      niatAtasNama: "Alm. H. Abdullah",
      status: "Disalurkan",
      paymentStatus: "Lunas",
    },
  });

  console.log("\n✅ SUCCESS: All Dummy Test Data created successfully!");
  console.log("📌 All dummy records have IDs starting with 'DUMMY-'.");
  console.log("🧹 To clear all dummy data anytime, run: npm run clean:dummy\n");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding dummy data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
