import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { resolveOperationalName } from "@/shared/lib/name-resolver";
import type { StatusInvoice } from "@/shared/types";

// ────────────────────────────────────────────────────────────
// Indonesian Names & Data for Realistic Seed Generation
// ────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  "Ahmad", "Siti", "Muhammad", "Nur", "Dewi", "Rudi", "Budi", "Sri", "Ratna",
  "Agus", "Dian", "Eko", "Fitri", "Gunawan", "Hendra", "Indah", "Joko",
  "Kartika", "Lina", "Made",
];

const LAST_NAMES = [
  "Fauzi", "Rahma", "Hidayat", "Wijaya", "Kusuma", "Santoso", "Pratama",
  "Permata", "Hapsari", "Nugroho", "Saputra", "Wibowo", "Hartono", "Setiawan",
  "Susanto", "Rahayu", "Handayani", "Utami", "Putri", "Putra",
];

const CITIES = [
  "Jakarta", "Surabaya", "Bandung", "Medan", "Semarang", "Makassar",
  "Palembang", "Yogyakarta", "Tangerang", "Depok", "Bekasi", "Surakarta",
  "Malang", "Denpasar", "Padang",
];

const PROVINCES = [
  "DKI Jakarta", "Jawa Timur", "Jawa Barat", "Sumatera Utara", "Jawa Tengah",
  "Sulawesi Selatan", "Sumatera Selatan", "DI Yogyakarta", "Banten", "Jawa Barat",
  "Jawa Tengah", "Jawa Timur", "Bali", "Sumatera Barat", "Riau",
];

const PLACES = [
  "Jakarta", "Surabaya", "Bandung", "Medan", "Yogyakarta", "Semarang",
  "Makassar", "Palembang", "Bogor", "Malang", "Solo", "Denpasar", "Padang",
  "Balikpapan", "Manado", "Aceh", "Lampung", "Pontianak", "Batam", "Pekanbaru",
];

const STREETS = [
  "Jl. Merdeka", "Jl. Sudirman", "Jl. Gatot Subroto", "Jl. Ahmad Yani",
  "Jl. Diponegoro", "Jl. Pahlawan", "Jl. Kebon Sirih", "Jl. Thamrin",
  "Jl. Rasuna Said", "Jl. Asia Afrika",
];

const MALE_NAMES = [
  "Ahmad", "Muhammad", "Rudi", "Budi", "Agus", "Eko", "Gunawan", "Hendra",
  "Joko", "Made", "Doni", "Fajar", "Herman", "Irfan", "Kurniawan",
];

const FEMALE_NAMES = [
  "Siti", "Nur", "Dewi", "Sri", "Ratna", "Dian", "Fitri", "Indah", "Kartika",
  "Lina", "Rina", "Maya", "Yuni", "Rini", "Tuti",
];

const GROUP_PREFIXES = [
  "Al-Falah", "Al-Barkah", "An-Nur", "Al-Hikmah", "As-Salam", "Al-Ikhwan",
  "Al-Karim", "Al-Madinah", "Al-Makkah", "Ar-Rahman", "Baitullah",
  "Cahaya Haji", "Darussalam", "Fajar Umroh", "Harapan Suci", "Indah Travel",
  "Keluarga Sakinah", "Miftahul Jannah", "Nurul Huda", "Puri Insani",
];

const KEBERANGKATAN_TEMPLATES = [
  {
    kode: "UMR-2026-001",
    namaPaket: "Umroh Reguler Januari 2026",
    maskapai: "Saudi Arabian Airlines",
    nomorPenerbangan: "SV-1234",
    hotelMekkah: "Makkah Tower Hotel",
    hotelMadinah: "Al-Madinah Palace",
    hargaPaket: 35000000,
    kuota: 100,
  },
  {
    kode: "UMR-2026-002",
    namaPaket: "Umroh VIP Maret 2026",
    maskapai: "Emirates",
    nomorPenerbangan: "EK-5678",
    hotelMekkah: "Jabal Omar Hilton",
    hotelMadinah: "Movenpick Madinah",
    hargaPaket: 55000000,
    kuota: 50,
  },
  {
    kode: "UMR-2026-003",
    namaPaket: "Umroh Hemat Mei 2026",
    maskapai: "Lion Air",
    nomorPenerbangan: "JT-9012",
    hotelMekkah: "Al-Marwa Rayhaan",
    hotelMadinah: "Qiblatain Hotel 2",
    hargaPaket: 25000000,
    kuota: 150,
  },
  {
    kode: "UMR-2026-004",
    namaPaket: "Umroh Plus Ramadhan 2026",
    maskapai: "Garuda Indonesia",
    nomorPenerbangan: "GA-3456",
    hotelMekkah: "Swissotel Makkah",
    hotelMadinah: "Oberoi Madinah",
    hargaPaket: 65000000,
    kuota: 75,
  },
  {
    kode: "UMR-2026-005",
    namaPaket: "Umroh Premium September 2026",
    maskapai: "Qatar Airways",
    nomorPenerbangan: "QR-7890",
    hotelMekkah: "Fairmont Makkah",
    hotelMadinah: "Al-Aqeeq Hotel",
    hargaPaket: 75000000,
    kuota: 40,
  },
];

// ────────────────────────────────────────────────────────────
// Utility Helpers
// ────────────────────────────────────────────────────────────

function randomPick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date): string {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  ).toISOString();
}

function generateKodeRegistrasi(seq: number): string {
  return `GRP-2026-${String(seq).padStart(5, "0")}`;
}

function generateNIK(): string {
  const area =
    String(randomInt(10, 99)) +
    String(randomInt(10, 99)) +
    String(randomInt(10, 99));
  const day = String(randomInt(1, 28)).padStart(2, "0");
  const month = String(randomInt(1, 12)).padStart(2, "0");
  const year = String(randomInt(60, 99)).padStart(2, "0");
  const serial = String(randomInt(1, 9999)).padStart(4, "0");
  return area + day + month + year + serial;
}

function generatePassport(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const letter = letters[randomInt(0, letters.length - 1)];
  const digits = String(randomInt(100000, 99999999));
  return letter + digits;
}

function generatePhone(): string {
  return `08${String(randomInt(100000000, 999999999))}`;
}

// ────────────────────────────────────────────────────────────
// Action: seed-test-data
// ────────────────────────────────────────────────────────────

async function seedTestData(repos: any, params: any) {
  const { jamaahRepo, groupRepo, keberangkatanRepo, invoiceRepo } = repos;
  const groupCount = Math.max(1, params.groupCount ?? 15);
  const keberangkatanCount = Math.min(
    Math.max(1, params.keberangkatanCount ?? 4),
    KEBERANGKATAN_TEMPLATES.length,
  );

  const createdKeberangkatan: Array<{ id: string; kode: string; namaPaket: string; hargaPaket: number; hotelMekkah: string; hotelMadinah: string }> = [];
  const createdGroups: Array<{ id: string; kodeRegistrasi: string; namaGroup: string; keberangkatanId: string }> = [];
  let totalJamaahCreated = 0;

  // 1. Create Keberangkatan (departure packages)
  const berangkatStart = new Date("2026-01-15");

  for (let i = 0; i < keberangkatanCount; i++) {
    const tmpl = KEBERANGKATAN_TEMPLATES[i]!;
    const tglBerangkat = new Date(
      berangkatStart.getTime() + i * 75 * 86400000,
    );
    const tglPulang = new Date(tglBerangkat.getTime() + 12 * 86400000);

    const keberangkatan = await keberangkatanRepo.create({
      kode: tmpl.kode,
      namaPaket: tmpl.namaPaket,
      hargaPaket: tmpl.hargaPaket,
      tanggalBerangkat: tglBerangkat.toISOString(),
      tanggalPulang: tglPulang.toISOString(),
      maskapai: tmpl.maskapai,
      nomorPenerbangan: tmpl.nomorPenerbangan,
      hotelMekkah: tmpl.hotelMekkah,
      hotelMadinah: tmpl.hotelMadinah,
      hotelOptions: [
        { hotelMekkah: tmpl.hotelMekkah, hotelMadinah: tmpl.hotelMadinah },
      ],
      status: "preparing",
      kuota: tmpl.kuota,
      terisi: 0,
    });
    createdKeberangkatan.push({
      id: keberangkatan.id,
      kode: keberangkatan.kode,
      namaPaket: keberangkatan.namaPaket,
      hargaPaket: keberangkatan.hargaPaket,
      hotelMekkah: tmpl.hotelMekkah,
      hotelMadinah: tmpl.hotelMadinah,
    });
  }

  // 2. Create Groups and Jamaah distributed across keberangkatan
  const groupsPerKeberangkatan = Math.ceil(groupCount / keberangkatanCount);
  let groupSeq = 1;

  for (let ki = 0; ki < createdKeberangkatan.length; ki++) {
    const kb = createdKeberangkatan[ki]!;
    const groupsForThis = Math.min(
      groupsPerKeberangkatan,
      groupCount - ki * groupsPerKeberangkatan,
    );
    let totalTerisi = 0;

    for (let gi = 0; gi < groupsForThis && groupSeq <= groupCount; gi++) {
      const kodeReg = generateKodeRegistrasi(groupSeq);
      const groupName = `${randomPick(GROUP_PREFIXES)} ${groupSeq}`;
      const jamaahCount = randomInt(3, 8);
      const perJamaahHarga = kb.hargaPaket;
      const groupTotalTagihan = jamaahCount * perJamaahHarga;

      const group = await groupRepo.create({
        kodeRegistrasi: kodeReg,
        namaGroup: groupName,
        ketuaGroupId: "",
        paketKeberangkatanId: kb.id,
        jumlahAnggota: jamaahCount,
        totalTagihan: groupTotalTagihan,
        totalPembayaran: 0,
        sisaPembayaran: groupTotalTagihan,
        status: "active",
      });

      createdGroups.push({
        id: group.id,
        kodeRegistrasi: kodeReg,
        namaGroup: groupName,
        keberangkatanId: kb.id,
      });

      // Create jamaah for this group
      for (let ji = 0; ji < jamaahCount; ji++) {
        totalJamaahCreated++;
        const jenisKelamin = randomPick<"L" | "P">(["L", "P"]);
        const firstName =
          jenisKelamin === "L"
            ? randomPick(MALE_NAMES)
            : randomPick(FEMALE_NAMES);
        const lastName = randomPick(LAST_NAMES);
        const tanggalLahir = randomDate(
          new Date("1960-01-01"),
          new Date("2000-12-31"),
        );
        const birthYear = new Date(tanggalLahir).getFullYear();

        await jamaahRepo.create({
          registrationId: `${kodeReg}-${ji + 1}`,
          groupId: group.id,
          nomorPeserta: `P-${String(totalJamaahCreated).padStart(5, "0")}`,
          namaLengkap: `${firstName} ${lastName}`,
          namaAyah: `H. ${randomPick(FIRST_NAMES)} ${randomPick(LAST_NAMES)}`,
          jenisKelamin,
          tempatLahir: randomPick(PLACES),
          tanggalLahir,
          nik: generateNIK(),
          nomorPaspor: generatePassport(),
          masaBerlakuPaspor: new Date(birthYear + 45, 11, 31).toISOString(),
          nomorTelepon: generatePhone(),
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 99)}@email.com`,
          alamat: `${randomPick(STREETS)} No. ${randomInt(1, 200)}`,
          provinsi: randomPick(PROVINCES),
          kota: randomPick(CITIES),
          kecamatan: `Kec. ${randomPick(PLACES)}`,
          kelurahan: `Kel. ${randomPick(PLACES)}`,
          syaratDisetujui: true,
          status: "registered",
          hotelMekkah: kb.hotelMekkah,
          hotelMadinah: kb.hotelMadinah,
        });
      }

      // Create an invoice for the group (full amount, unpaid, past due)
      const jatuhTempo = new Date(
        Date.now() - randomInt(5, 60) * 86400000,
      ).toISOString();

      await invoiceRepo.create({
        nomorInvoice: `INV-${kodeReg}`,
        groupId: group.id,
        tipe: "pelunasan",
        jumlah: groupTotalTagihan,
        sisaTagihan: groupTotalTagihan,
        status: "unpaid",
        jatuhTempo,
        items: [
          {
            kategori: "Paket Umroh",
            deskripsi: `Biaya penuh ${kb.namaPaket}`,
            qty: jamaahCount,
            hargaSatuan: perJamaahHarga,
            status: "active",
          },
        ],
      });

      totalTerisi += jamaahCount;
      groupSeq++;
    }

    // Update keberangkatan terisi count
    if (totalTerisi > 0) {
      await keberangkatanRepo.update(kb.id, {
        terisi: totalTerisi,
      } as any);
    }
  }

  return {
    message: `Seeded ${createdKeberangkatan.length} keberangkatan, ${createdGroups.length} groups, ${totalJamaahCreated} jamaah with invoices`,
    counts: {
      keberangkatan: createdKeberangkatan.length,
      groups: createdGroups.length,
      jamaah: totalJamaahCreated,
    },
  };
}

// ────────────────────────────────────────────────────────────
// Action: generate-overdue
// ────────────────────────────────────────────────────────────

async function generateOverdue(repos: any, params: any) {
  const { invoiceRepo } = repos;
  const maxCount = params.count ?? 10;

  const { data: allInvoices } = await invoiceRepo.findAll();
  const now = new Date();

  const candidates = allInvoices.filter(
    (inv: any) =>
      (inv.status === "unpaid" || inv.status === "partial") &&
      new Date(inv.jatuhTempo) < now,
  );

  const toMark = candidates.slice(0, maxCount);
  const markedInvoices: Array<{ id: string; nomorInvoice: string }> = [];

  for (const inv of toMark) {
    await invoiceRepo.updateStatus(inv.id, "overdue" as StatusInvoice);
    markedInvoices.push({ id: inv.id, nomorInvoice: inv.nomorInvoice });
  }

  return {
    message: `Marked ${markedInvoices.length} invoices as overdue`,
    count: markedInvoices.length,
    invoices: markedInvoices,
  };
}

// ────────────────────────────────────────────────────────────
// Action: process-payments
// ────────────────────────────────────────────────────────────

async function processPayments(repos: any, params: any) {
  const { groupRepo, pembayaranRepo, jamaahRepo } = repos;
  const maxCount = params.count ?? 15;

  const { data: allGroups } = await groupRepo.findAll();
  const groupsWithBalance = allGroups.filter(
    (g: any) => g.sisaPembayaran > 0 && g.jumlahAnggota > 0,
  );

  const toProcess = groupsWithBalance.slice(0, maxCount);
  let processed = 0;
  let totalAmount = 0;

  for (const group of toProcess) {
    const jamaahs = await jamaahRepo.findByGroup(group.id);
    if (jamaahs.length === 0) continue;

    // Pay 50–90 % of remaining balance
    const paymentAmount = Math.max(
      100000,
      Math.min(
        Math.floor(group.sisaPembayaran * (0.5 + Math.random() * 0.4)),
        group.sisaPembayaran,
      ),
    );

    const perJamaah = Math.floor(paymentAmount / jamaahs.length);
    const alokasi = jamaahs.map((j: any) => ({
      jamaahId: j.id,
      namaJamaah: j.namaLengkap,
      jumlah: perJamaah,
    }));
    // Adjust rounding on the last item
    const currentTotal = alokasi.reduce((s: number, a: any) => s + a.jumlah, 0);
    if (alokasi.length > 0) {
      alokasi[alokasi.length - 1].jumlah += paymentAmount - currentTotal;
    }

    // Create as pending then approve so group totals are updated
    const payment = await pembayaranRepo.create({
      groupId: group.id,
      jumlah: paymentAmount,
      metode: "transfer",
      tanggal: new Date().toISOString(),
      status: "pending",
      sumber: "admin",
      bankPengirim: "Simulasi Bank",
      nomorRekening: `SIM-${String(Date.now()).slice(-8)}`,
      alokasi,
    });

    await pembayaranRepo.approve(payment.id, "simulation-system");

    processed++;
    totalAmount += paymentAmount;
  }

  return {
    message: `Processed ${processed} payments totaling Rp ${totalAmount.toLocaleString("id-ID")}`,
    processed,
    totalAmount,
  };
}

// ────────────────────────────────────────────────────────────
// Action: simulate-rooming  (NEW)
// ────────────────────────────────────────────────────────────

async function simulateRooming(repos: any, params: any) {
  const { keberangkatanRepo, groupRepo, jamaahRepo, roomingRepo } = repos;
  const specifiedId = params.keberangkatanId;

  const { data: allKeberangkatan } = await keberangkatanRepo.findAll();
  const keberangkatan = specifiedId
    ? allKeberangkatan.find((k: any) => k.id === specifiedId)
    : allKeberangkatan[0];

  if (!keberangkatan) {
    throw new Error(
      specifiedId
        ? `Keberangkatan with ID "${specifiedId}" not found`
        : "No keberangkatan found — run seed-test-data first",
    );
  }

  // Gather all jamaah across all groups of this keberangkatan
  const { data: groups } = await groupRepo.findAll({
    keberangkatanId: keberangkatan.id,
  });
  const allJamaah: any[] = [];
  for (const g of groups) {
    const jamaahs = await jamaahRepo.findByGroup(g.id);
    allJamaah.push(...jamaahs);
  }

  if (allJamaah.length === 0) {
    throw new Error(
      `No jamaah found for keberangkatan "${keberangkatan.namaPaket}"`,
    );
  }

  // Build rooms (weighted: more doubles, some triples, some quads)
  const TIPE_KAMAR = [
    "double",
    "double",
    "double",
    "triple",
    "triple",
    "quad",
  ] as const;
  const KAPASITAS: Record<string, number> = {
    double: 2,
    triple: 3,
    quad: 4,
  };
  const ROOMS_PER_FLOOR = 15;

  let remaining = [...allJamaah];
  const kamars: Array<{
    nomorKamar: string;
    tipe: string;
    lantai: number;
    penghuni: Array<{
      jamaahId: string;
      namaLengkap: string;
      jenisKelamin: string;
      isPasangan: boolean;
    }>;
  }> = [];
  let roomIdx = 0;

  while (remaining.length > 0) {
    const tipe = TIPE_KAMAR[randomInt(0, TIPE_KAMAR.length - 1)]!;
    const kapasitas = KAPASITAS[tipe]!;
    const penghuniCount = Math.min(kapasitas, remaining.length);
    const penghuni = remaining.slice(0, penghuniCount);
    remaining = remaining.slice(penghuniCount);

    const lantai = Math.floor(roomIdx / ROOMS_PER_FLOOR) + 1;
    const roomOnFloor = (roomIdx % ROOMS_PER_FLOOR) + 1;
    const nomorKamar = `${lantai}${String(roomOnFloor).padStart(2, "0")}`;

    kamars.push({
      nomorKamar,
      tipe,
      lantai: lantai,
      penghuni: penghuni.map((j: any) => ({
        jamaahId: j.id,
        namaLengkap: j.namaLengkap,
        jenisKelamin: j.jenisKelamin,
        isPasangan: false,
      })),
    });
    roomIdx++;
  }

  const rooming = await roomingRepo.create({
    keberangkatanId: keberangkatan.id,
    hotelMekkah: keberangkatan.hotelMekkah,
    hotelMadinah: keberangkatan.hotelMadinah,
    hotelNama: `${keberangkatan.hotelMekkah} / ${keberangkatan.hotelMadinah}`,
    status: "draft",
    kamar: kamars,
  });

  return {
    message: `Rooming created for "${keberangkatan.namaPaket}" — ${kamars.length} rooms, ${allJamaah.length} jamaah`,
    roomingId: rooming.id,
    roomsCreated: kamars.length,
    jamaahAssigned: allJamaah.length,
  };
}

// ────────────────────────────────────────────────────────────
// Action: simulate-manifest  (NEW)
// ────────────────────────────────────────────────────────────

async function simulateManifest(repos: any, params: any) {
  const { keberangkatanRepo, groupRepo, jamaahRepo, manifestRepo } = repos;
  const specifiedId = params.keberangkatanId;

  const { data: allKeberangkatan } = await keberangkatanRepo.findAll();
  const keberangkatan = specifiedId
    ? allKeberangkatan.find((k: any) => k.id === specifiedId)
    : allKeberangkatan[0];

  if (!keberangkatan) {
    throw new Error(
      specifiedId
        ? `Keberangkatan with ID "${specifiedId}" not found`
        : "No keberangkatan found — run seed-test-data first",
    );
  }

  const { data: groups } = await groupRepo.findAll({
    keberangkatanId: keberangkatan.id,
  });
  const allJamaah: any[] = [];
  for (const g of groups) {
    const jamaahs = await jamaahRepo.findByGroup(g.id);
    allJamaah.push(...jamaahs);
  }

  if (allJamaah.length === 0) {
    throw new Error(
      `No jamaah found for keberangkatan "${keberangkatan.namaPaket}"`,
    );
  }

  const SEAT_LETTERS = ["A", "B", "C", "D", "E", "F"];
  const rows = allJamaah.map((j: any, i: number) => ({
    nomorUrut: i + 1,
    jamaahId: j.id,
    nomorPaspor: j.nomorPaspor,
    namaLengkap: resolveOperationalName(j, j.dokumen),
    tempatLahir: j.tempatLahir,
    tanggalLahir: j.tanggalLahir,
    nomorKursi: `${String(i + 1).padStart(2, "0")}${SEAT_LETTERS[i % SEAT_LETTERS.length]}`,
  }));

  const manifest = await manifestRepo.create({
    keberangkatanId: keberangkatan.id,
    kode: `MNF-${keberangkatan.kode}`,
    namaManifest: `Manifest ${keberangkatan.namaPaket}`,
    status: "draft",
    rows,
  });

  return {
    message: `Manifest created for "${keberangkatan.namaPaket}" — ${rows.length} rows`,
    manifestId: manifest.id,
    rowsCreated: rows.length,
  };
}

// ────────────────────────────────────────────────────────────
// Action: simulate-exports  (NEW)
// ────────────────────────────────────────────────────────────

async function simulateExports(repos: any, params: any, session: any) {
  const { keberangkatanRepo } = repos;
  const exportCount = params.exportCount ?? 3;
  const ocrCount = params.ocrCount ?? 5;
  const reminderCount = params.reminderCount ?? 5;

  const {
    enqueueExportGenerator,
    enqueueDocumentOcr,
    enqueuePaymentReminder,
  } = await import("@/server/queue/producer");

  const { data: allKeberangkatan } = await keberangkatanRepo.findAll();
  const keberangkatanIds = allKeberangkatan.map((k: any) => k.id);
  const userId = session?.user?.id || "simulation-system";

  const exportTypes = ["manifest", "rooming", "invoice", "payment", "jamaah"] as const;
  const exportFormats = ["csv", "xlsx", "pdf"] as const;
  const exportJobs: string[] = [];

  for (let i = 0; i < exportCount; i++) {
    const job = await enqueueExportGenerator({
      id: `sim-export-${Date.now()}-${i}`,
      queue: "export-generator",
      createdAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 2,
      data: {
        exportType: exportTypes[i % exportTypes.length] as any,
        format: exportFormats[i % exportFormats.length] as any,
        packageId: keberangkatanIds.length > 0
          ? keberangkatanIds[i % keberangkatanIds.length]
          : undefined,
        filters: undefined,
        requestedBy: userId,
      },
    });
    exportJobs.push(job.jobId);
  }

  // Enqueue OCR jobs (simulated dokumen IDs)
  const docTypes = ["paspor", "ktp", "vaksin", "pas_foto"];
  const ocrJobs: string[] = [];
  for (let i = 0; i < ocrCount; i++) {
    const job = await enqueueDocumentOcr({
      id: `sim-ocr-${Date.now()}-${i}`,
      queue: "document-ocr",
      createdAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3,
      data: {
        dokumenId: `sim-doc-${Date.now()}-${i}`,
        jamaahId: `sim-jamaah-${i}`,
        fileUrl: `/uploads/simulation/doc-${i}.jpg`,
        jenisDokumen: docTypes[i % docTypes.length]!,
      },
    });
    ocrJobs.push(job.jobId);
  }

  // Enqueue payment reminder jobs
  const reminderTypes = ["h7", "h3", "h1", "overdue"] as const;
  const reminderJobs: string[] = [];
  for (let i = 0; i < reminderCount; i++) {
    const job = await enqueuePaymentReminder({
      id: `sim-reminder-${Date.now()}-${i}`,
      queue: "payment-reminder",
      createdAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 2,
      data: {
        groupId: `sim-group-${i}`,
        invoiceId: `sim-invoice-${i}`,
        reminderType: reminderTypes[i % reminderTypes.length] as any,
        channel: "whatsapp",
      },
    });
    reminderJobs.push(job.jobId);
  }

  return {
    message: `Enqueued ${exportJobs.length} export, ${ocrJobs.length} OCR, ${reminderJobs.length} reminder jobs`,
    exportJobs,
    ocrJobs,
    reminderJobs,
    totals: {
      exports: exportJobs.length,
      ocr: ocrJobs.length,
      reminders: reminderJobs.length,
    },
  };
}

// ────────────────────────────────────────────────────────────
// Action: stress-test  (NEW)
// ────────────────────────────────────────────────────────────

async function stressTest(_repos: any, params: any) {
  const ocrCount = params.ocrCount ?? 25;
  const exportCount = params.exportCount ?? 15;
  const reminderCount = params.reminderCount ?? 15;
  const notificationCount = params.notificationCount ?? 10;

  const {
    enqueueDocumentOcr,
    enqueueExportGenerator,
    enqueuePaymentReminder,
    enqueueNotificationDispatch,
  } = await import("@/server/queue/producer");

  const docTypes = ["paspor", "ktp", "vaksin", "pas_foto"];
  const exportTypes = ["manifest", "rooming", "invoice", "payment", "jamaah"] as const;
  const reminderTypes = ["h7", "h3", "h1", "overdue"] as const;

  // Enqueue 25+ OCR jobs
  const ocrJobs: string[] = [];
  for (let i = 0; i < ocrCount; i++) {
    const job = await enqueueDocumentOcr({
      id: `stress-ocr-${Date.now()}-${i}`,
      queue: "document-ocr",
      createdAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3,
      data: {
        dokumenId: `stress-doc-${i}`,
        jamaahId: `stress-jamaah-${i}`,
        fileUrl: `/uploads/stress/doc-${i}.jpg`,
        jenisDokumen: docTypes[i % docTypes.length]!,
      },
    });
    ocrJobs.push(job.jobId);
  }

  // Enqueue 15+ export jobs
  const exportJobs: string[] = [];
  for (let i = 0; i < exportCount; i++) {
    const job = await enqueueExportGenerator({
      id: `stress-export-${Date.now()}-${i}`,
      queue: "export-generator",
      createdAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 2,
      data: {
        exportType: exportTypes[i % exportTypes.length] as any,
        format: "csv",
        requestedBy: "stress-test",
      },
    });
    exportJobs.push(job.jobId);
  }

  // Enqueue 15+ reminder jobs
  const reminderJobs: string[] = [];
  for (let i = 0; i < reminderCount; i++) {
    const job = await enqueuePaymentReminder({
      id: `stress-reminder-${Date.now()}-${i}`,
      queue: "payment-reminder",
      createdAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 2,
      data: {
        groupId: `stress-group-${i}`,
        invoiceId: `stress-inv-${i}`,
        reminderType: reminderTypes[i % reminderTypes.length] as any,
        channel: "whatsapp",
      },
    });
    reminderJobs.push(job.jobId);
  }

  // Enqueue 10+ notification dispatch jobs
  const notificationJobs: string[] = [];
  for (let i = 0; i < notificationCount; i++) {
    const job = await enqueueNotificationDispatch({
      id: `stress-notify-${Date.now()}-${i}`,
      queue: "notification-dispatch",
      createdAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 2,
      data: {
        type: "reminder",
        targetJamaahIds: [`stress-target-${i}`],
        templateId: "stress-template",
        templateVars: { nama: "Test" },
      },
    });
    notificationJobs.push(job.jobId);
  }

  return {
    message: `Stress test: ${ocrJobs.length} OCR, ${exportJobs.length} export, ${reminderJobs.length} reminder, ${notificationJobs.length} notification jobs enqueued`,
    perQueue: {
      "document-ocr": ocrJobs.length,
      "export-generator": exportJobs.length,
      "payment-reminder": reminderJobs.length,
      "notification-dispatch": notificationJobs.length,
    },
  };
}

// ────────────────────────────────────────────────────────────
// POST Route Handler
// ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── Guard: authentication & RBAC ──────────────────────────
  const session = await auth();
  const perm = checkServerPermission(session, "sistem", "create");
  if (!perm.allowed) {
    return NextResponse.json(
      { success: false, message: perm.reason },
      { status: 403 },
    );
  }

  // ── Guard: block in production ────────────────────────────
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { success: false, message: "Simulation not available in production" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const action = body.action as string;

    // ── Dynamic imports (DB & repositories) ──────────────────
    const { jamaahRepo } = await import(
      "@/server/repositories/jamaah.repository"
    );
    const { groupRepo } = await import(
      "@/server/repositories/group.repository"
    );
    const { keberangkatanRepo } = await import(
      "@/server/repositories/keberangkatan.repository"
    );
    const { invoiceRepo } = await import(
      "@/server/repositories/invoice.repository"
    );
    const { pembayaranRepo } = await import(
      "@/server/repositories/pembayaran.repository"
    );
    const { roomingRepo } = await import(
      "@/server/repositories/rooming.repository"
    );
    const { manifestRepo } = await import(
      "@/server/repositories/manifest.repository"
    );

    const repos = {
      jamaahRepo,
      groupRepo,
      keberangkatanRepo,
      invoiceRepo,
      pembayaranRepo,
      roomingRepo,
      manifestRepo,
    };

    let result: unknown;

    switch (action) {
      case "seed-test-data":
        result = await seedTestData(repos, body);
        break;

      case "generate-overdue":
        result = await generateOverdue(repos, body);
        break;

      case "process-payments":
        result = await processPayments(repos, body);
        break;

      case "simulate-rooming":
        result = await simulateRooming(repos, body);
        break;

      case "simulate-manifest":
        result = await simulateManifest(repos, body);
        break;

      case "simulate-exports":
        result = await simulateExports(repos, body, session);
        break;

      case "stress-test":
        result = await stressTest(repos, body);
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            message: `Unknown action: "${action}". Valid actions: seed-test-data, generate-overdue, process-payments, simulate-rooming, simulate-manifest, simulate-exports, stress-test`,
          },
          { status: 400 },
        );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    const message = error?.message ?? String(error);

    // Detect database unavailability
    if (
      message.includes("ECONNREFUSED") ||
      message.includes("connect ECONN") ||
      message.toLowerCase().includes("cannot reach database") ||
      message.includes("PrismaClientInitializationError") ||
      message.includes("prisma") && (message.includes("connect") || message.includes("initialization"))
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Database unavailable — simulation requires a running PostgreSQL instance",
          detail: message,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { success: false, message },
      { status: 500 },
    );
  }
}
