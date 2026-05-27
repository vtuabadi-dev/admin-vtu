import type {
  RegistrationGroup,
  Jamaah,
  Keberangkatan,
  Invoice,
  DokumenItem,
  Pembayaran,
  GroupPaymentSummary,
  Manifest,
  ManifestRow,
  Rooming,
  Kamar,
  DashboardStats,
  OperationalAlert,
  Reminder,
} from "@/shared/types";
import { deriveGroupPaymentStatus } from "@/shared/lib/payment-utils";

// --- Realistic Indonesian data generators ---
const namaDepan = [
  "Ahmad", "Muhammad", "Abdul", "Siti", "Nur", "Dewi", "Rahmat", "Hasan",
  "Hussein", "Ali", "Fatimah", "Aisyah", "Zainab", "Umar", "Bilal", "Hamzah",
  "Yusuf", "Ibrahim", "Ismail", "Maryam",
];
const namaBelakang = [
  "Hidayat", "Santoso", "Wijaya", "Kusuma", "Pratama", "Setiawan", "Rahman",
  "Abdullah", "Hermawan", "Sudrajat", "Nugroho", "Saputra", "Maulana",
  "Firdaus", "Zulkarnain", "Syafii", "Ramadan", "Irawan", "Hartono", "Lestari",
];

function randomNama(): string {
  const depan = namaDepan[Math.floor(Math.random() * namaDepan.length)]!;
  const belakang = namaBelakang[Math.floor(Math.random() * namaBelakang.length)]!;
  return `${depan} ${belakang}`;
}

function randomNik(): string {
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join("");
}

function randomPaspor(): string {
  const huruf = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const h1 = huruf[Math.floor(Math.random() * 26)];
  const h2 = huruf[Math.floor(Math.random() * 26)];
  const num = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join("");
  return `${h1}${h2}${num}`;
}

function makeRegistrationId(groupKode: string, childNum: number): string {
  return `${groupKode}-${childNum}`;
}

// ============================================================
// KEBERANGKATAN
// ============================================================

export const mockKeberangkatan: Keberangkatan[] = [
  {
    id: "kbr-001",
    kode: "UMRH-JUN-2026",
    namaPaket: "Umroh Reguler 9 Hari",
    hargaPaket: 50000000,
    tanggalBerangkat: "2026-06-15",
    tanggalPulang: "2026-06-23",
    maskapai: "Saudi Airlines",
    nomorPenerbangan: "SV-818",
    hotelMekkah: "Safwa",
    hotelMadinah: "Taiba",
    hotelOptions: [
      { hotelMekkah: "Safwa", hotelMadinah: "Taiba" },
      { hotelMekkah: "Anjum", hotelMadinah: "Taiba" },
      { hotelMekkah: "Safwa", hotelMadinah: "Grand Plaza" },
      { hotelMekkah: "Maysan Mashaer", hotelMadinah: "Grand Plaza" },
    ],
    status: "preparing",
    kuota: 45,
    terisi: 16,
    jamaahIds: [],
  },
  {
    id: "kbr-002",
    kode: "UMRH-JUL-2026",
    namaPaket: "Umroh Plus Dubai 12 Hari",
    hargaPaket: 75000000,
    tanggalBerangkat: "2026-07-20",
    tanggalPulang: "2026-08-01",
    maskapai: "Emirates",
    nomorPenerbangan: "EK-358",
    hotelMekkah: "Pullman Zamzam",
    hotelMadinah: "Anwar Al Madinah Mövenpick",
    hotelOptions: [
      { hotelMekkah: "Pullman Zamzam", hotelMadinah: "Anwar Al Madinah Mövenpick" },
      { hotelMekkah: "Pullman Zamzam", hotelMadinah: "Dallah Taibah" },
    ],
    status: "scheduled",
    kuota: 40,
    terisi: 8,
    jamaahIds: [],
  },
  {
    id: "kbr-003",
    kode: "UMRH-AGT-2026",
    namaPaket: "Umroh Hemat 9 Hari",
    hargaPaket: 35000000,
    tanggalBerangkat: "2026-08-10",
    tanggalPulang: "2026-08-18",
    maskapai: "Garuda Indonesia",
    nomorPenerbangan: "GA-968",
    hotelMekkah: "Elaf Kinda Hotel",
    hotelMadinah: "Al Haram Hotel",
    hotelOptions: [
      { hotelMekkah: "Elaf Kinda Hotel", hotelMadinah: "Al Haram Hotel" },
    ],
    status: "scheduled",
    kuota: 50,
    terisi: 0,
    jamaahIds: [],
  },
];

// ============================================================
// GENERATE JAMAAH (16 people across 5 registration groups)
// ============================================================

function generateDokumen(jamaahId: string): DokumenItem[] {
  const jenisList: { jenis: DokumenItem["jenis"]; wajib: boolean }[] = [
    { jenis: "paspor", wajib: true },
    { jenis: "pas_foto", wajib: true },
    { jenis: "vaksin", wajib: true },
    { jenis: "ktp", wajib: true },
    { jenis: "kk", wajib: false },
    { jenis: "akta", wajib: false },
  ];
  const statusPool: DokumenItem["status"][] = [
    "lengkap", "lengkap", "verified", "verified", "pending", "kurang", "revisi", "processing",
  ];
  const dataStatusPool: Array<DokumenItem["dataStatus"]> = [
    "valid", "valid", "valid", "pending", "manual_edit", "ocr_error",
  ];
  return jenisList.map(({ jenis, wajib }, i) => {
    const status = statusPool[Math.floor(Math.random() * statusPool.length)]!;
    const hasOcr = status === "verified" || status === "lengkap" || status === "revisi" || status === "processing";
    const isReupload = status === "revisi" && Math.random() > 0.5;
    const dataStatus: DokumenItem["dataStatus"] = hasOcr
      ? (dataStatusPool[Math.floor(Math.random() * dataStatusPool.length)]!)
      : "pending";
    const fileStatus: DokumenItem["fileStatus"] = status === "rejected" ? "rejected"
      : status === "revisi" ? "revisi"
      : status === "pending" ? "blurry"
      : "valid";
    return {
      id: `doc-${jamaahId}-${i}`,
      jamaahId,
      jenis,
      wajib,
      status,
      fileUrl: Math.random() > 0.3 ? `https://storage.example.com/${jamaahId}/${jenis}.pdf` : undefined,
      uploadedAt: Math.random() > 0.3
        ? new Date(Date.now() - Math.random() * 30 * 86400000).toISOString()
        : undefined,
      verifiedAt: status === "verified"
        ? new Date(Date.now() - Math.random() * 15 * 86400000).toISOString()
        : undefined,
      dataStatus,
      fileStatus,
      manualData: dataStatus === "manual_edit" ? {
        namaLengkap: Math.random() > 0.5 ? "Ahmad Hidayat" : undefined,
        nik: Math.random() > 0.5 ? "3273012345678901" : undefined,
      } : undefined,
      ocrRetryCount: isReupload ? Math.floor(Math.random() * 3) : 0,
      qualityCheck: isReupload || status === "revisi" ? {
        isBlurry: Math.random() > 0.6,
        isReadable: Math.random() > 0.3,
        checkedAt: new Date(Date.now() - Math.random() * 5 * 86400000).toISOString(),
      } : undefined,
    };
  });
}

interface RawJamaah {
  id: string;
  groupId: string;
  registrationId: string;
  namaLengkap: string;
}

export const mockJamaah: Jamaah[] = [];
const rawJamaah: RawJamaah[] = [];

// Group configurations
const groupConfigs = [
  { id: "grp-001", kode: "GRP-2026-00081", nama: "Keluarga Hidayat", paketId: "kbr-001", anggota: 4, hotelMekkah: "Safwa", hotelMadinah: "Taiba" },
  { id: "grp-002", kode: "GRP-2026-00082", nama: "Keluarga Kusuma", paketId: "kbr-001", anggota: 3, hotelMekkah: "Anjum", hotelMadinah: "Taiba" },
  { id: "grp-003", kode: "GRP-2026-00083", nama: "Keluarga Rahman", paketId: "kbr-001", anggota: 5, hotelMekkah: "Safwa", hotelMadinah: "Grand Plaza" },
  { id: "grp-004", kode: "GRP-2026-00084", nama: "Bapak Sudrajat (Personal)", paketId: "kbr-002", anggota: 1, hotelMekkah: "Pullman Zamzam", hotelMadinah: "Anwar Al Madinah Mövenpick" },
  { id: "grp-005", kode: "GRP-2026-00085", nama: "Keluarga Abdullah", paketId: "kbr-002", anggota: 2, hotelMekkah: "Pullman Zamzam", hotelMadinah: "Dallah Taibah" },
];

let jamaahCounter = 0;
for (const grp of groupConfigs) {
  for (let i = 1; i <= grp.anggota; i++) {
    jamaahCounter++;
    const id = `jmh-${String(jamaahCounter).padStart(3, "0")}`;
    const regId = makeRegistrationId(grp.kode, i);
    const nama = i === 1 ? `${randomNama()} (Ketua)` : randomNama();
    rawJamaah.push({ id, groupId: grp.id, registrationId: regId, namaLengkap: nama });

    const isGrp003Alt = grp.id === "grp-003" && i > 3;
    mockJamaah.push({
      id,
      registrationId: regId,
      groupId: grp.id,
      nomorPeserta: `P-${String(jamaahCounter).padStart(4, "0")}`,
      namaLengkap: nama,
      namaAyah: randomNama(),
      jenisKelamin: jamaahCounter % 3 === 0 ? "P" : "L",
      tempatLahir: ["Jakarta", "Bandung", "Surabaya", "Medan", "Semarang"][jamaahCounter % 5]!,
      tanggalLahir: `${1950 + Math.floor(Math.random() * 40)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
      nik: randomNik(),
      nomorPaspor: randomPaspor(),
      masaBerlakuPaspor: "2029-06-15",
      nomorTelepon: `08${Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join("")}`,
      email: `jamaah${jamaahCounter}@email.com`,
      alamat: `Jl. Merdeka No. ${Math.floor(Math.random() * 100) + 1}`,
      provinsi: ["DKI Jakarta", "Jawa Barat", "Jawa Timur", "Sumatera Utara", "Jawa Tengah"][jamaahCounter % 5]!,
      kota: ["Jakarta Pusat", "Bandung", "Surabaya", "Medan", "Semarang"][jamaahCounter % 5]!,
      kecamatan: "Kecamatan Contoh",
      kelurahan: "Kelurahan Contoh",
      tandaTanganDigital: Math.random() > 0.3 ? "data:image/png;base64,..." : undefined,
      syaratDisetujui: true,
      status: (["registered", "dokumen_upload", "dokumen_verified", "lunas", "ready"] as const)[
        Math.floor(Math.random() * 5)
      ]!,
      hotelMekkah: isGrp003Alt ? "Maysan Mashaer" : grp.hotelMekkah,
      hotelMadinah: grp.hotelMadinah,
      dokumen: generateDokumen(id),
      createdAt: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
    });
  }
}

// ============================================================
// REGISTRATION GROUPS
// ============================================================

export const mockGroups: RegistrationGroup[] = groupConfigs.map((grp) => {
  const anggotaIds = rawJamaah.filter((j) => j.groupId === grp.id).map((j) => j.id);
  const paket = mockKeberangkatan.find((k) => k.id === grp.paketId)!;
  const totalTagihan = grp.anggota * paket.hargaPaket;
  const totalPembayaran = Math.floor(totalTagihan * (Math.random() * 0.6 + 0.1)); // 10-70% paid
  return {
    id: grp.id,
    kodeRegistrasi: grp.kode,
    namaGroup: grp.nama,
    ketuaGroupId: anggotaIds[0]!,
    paketKeberangkatanId: grp.paketId,
    jumlahAnggota: grp.anggota,
    totalTagihan,
    totalPembayaran,
    sisaPembayaran: totalTagihan - totalPembayaran,
    status: "active",
    anggotaIds,
    createdAt: `2026-${String(Math.floor(Math.random() * 3) + 1).padStart(2, "0")}-15`,
    updatedAt: `2026-05-${String(Math.floor(Math.random() * 20) + 1).padStart(2, "0")}`,
  };
});

// Update jamaahIds in keberangkatan
for (const k of mockKeberangkatan) {
  k.jamaahIds = mockGroups
    .filter((g) => g.paketKeberangkatanId === k.id)
    .flatMap((g) => g.anggotaIds);
  k.terisi = k.jamaahIds.length;
}

// ============================================================
// GROUP-CENTRIC PAYMENTS
// ============================================================

export const mockPembayaran: Pembayaran[] = [
  {
    id: "byr-001",
    groupId: "grp-001",
    invoiceId: "inv-001",
    jumlah: 30000000,
    metode: "transfer",
    tanggal: "2026-02-20",
    status: "verified",
    sumber: "admin",
    verifiedBy: "Admin Ahmad",
    catatan: "DP transfer via BSI",
    alokasi: mockJamaah.filter(j => j.groupId === "grp-001").map(j => ({
      jamaahId: j.id,
      namaJamaah: j.namaLengkap,
      jumlah: 7500000,
    })),
  },
  {
    id: "byr-002",
    groupId: "grp-001",
    invoiceId: "inv-002",
    jumlah: 40000000,
    metode: "transfer",
    tanggal: "2026-04-10",
    status: "verified",
    sumber: "admin",
    verifiedBy: "Admin Fatimah",
    catatan: "Cicilan ke-1 via BCA",
    alokasi: mockJamaah.filter(j => j.groupId === "grp-001").map(j => ({
      jamaahId: j.id,
      namaJamaah: j.namaLengkap,
      jumlah: 10000000,
    })),
  },
  {
    id: "byr-003",
    groupId: "grp-002",
    invoiceId: "inv-003",
    jumlah: 30000000,
    metode: "cash",
    tanggal: "2026-03-01",
    status: "verified",
    sumber: "admin",
    verifiedBy: "Admin Ahmad",
    catatan: "DP cash di kantor",
    alokasi: mockJamaah.filter(j => j.groupId === "grp-002").map(j => ({
      jamaahId: j.id,
      namaJamaah: j.namaLengkap,
      jumlah: 10000000,
    })),
  },
  {
    id: "byr-004",
    groupId: "grp-003",
    invoiceId: "inv-004",
    jumlah: 25000000,
    metode: "transfer",
    tanggal: "2026-02-25",
    status: "verified",
    sumber: "admin",
    verifiedBy: "Admin Fatimah",
    catatan: "DP transfer via Mandiri",
    alokasi: mockJamaah.filter(j => j.groupId === "grp-003").slice(0, 3).map(j => ({
      jamaahId: j.id,
      namaJamaah: j.namaLengkap,
      jumlah: 8333333,
    })),
  },
  // Jamaah-submitted payments for review queue
  {
    id: "byr-005",
    groupId: "grp-001",
    invoiceId: "inv-002",
    jumlah: 10000000,
    metode: "transfer",
    tanggal: "2026-05-20",
    status: "pending",
    sumber: "jamaah",
    bankPengirim: "BSI",
    nomorRekening: "7123456789",
    buktiUrl: "/mock/bukti-transfer-001.jpg",
    catatan: "Cicilan ke-2, mohon dikonfirmasi",
    alokasi: [],
  },
  {
    id: "byr-006",
    groupId: "grp-002",
    invoiceId: "inv-003",
    jumlah: 15000000,
    metode: "transfer",
    tanggal: "2026-05-22",
    status: "pending",
    sumber: "jamaah",
    bankPengirim: "BCA",
    nomorRekening: "1987654321",
    buktiUrl: "/mock/bukti-transfer-002.jpg",
    catatan: "Pelunasan sisa DP",
    alokasi: [],
  },
  // Rejected jamaah payment
  {
    id: "byr-007",
    groupId: "grp-003",
    invoiceId: "inv-004",
    jumlah: 10000000,
    metode: "transfer",
    tanggal: "2026-05-18",
    status: "rejected",
    sumber: "jamaah",
    bankPengirim: "Mandiri",
    nomorRekening: "1231231234",
    buktiUrl: "/mock/bukti-transfer-003.jpg",
    alasanReject: "Nominal tidak sesuai",
    reviewedBy: "Admin Ahmad",
    reviewedAt: "2026-05-19T10:30:00Z",
    catatan: "Nominal yang ditransfer tidak sesuai dengan sisa tagihan",
    alokasi: [],
  },
];

// ============================================================
// INVOICES (group-centric)
// ============================================================

export const mockInvoices: Invoice[] = [
  {
    id: "inv-001",
    nomorInvoice: "INV/GRP-00081/DP/001",
    groupId: "grp-001",
    tipe: "dp",
    jumlah: 50000000,
    sisaTagihan: 20000000,
    status: "partial",
    jatuhTempo: "2026-03-15",
    items: [
      { id: "item-inv001-1", invoiceId: "inv-001", kategori: "Paket Umroh", deskripsi: "DP Paket Umroh Reguler per orang", qty: 4, hargaSatuan: 10000000, jumlah: 40000000, status: "active" },
      { id: "item-inv001-2", invoiceId: "inv-001", kategori: "Perlengkapan", deskripsi: "Perlengkapan ihram & travel kit", qty: 4, hargaSatuan: 1500000, jumlah: 6000000, status: "active" },
      { id: "item-inv001-3", invoiceId: "inv-001", kategori: "Handling", deskripsi: "Biaya handling & administrasi", qty: 1, hargaSatuan: 4000000, jumlah: 4000000, status: "active" },
    ],
    createdAt: "2026-01-15",
    updatedAt: "2026-02-20",
  },
  {
    id: "inv-002",
    nomorInvoice: "INV/GRP-00081/CLN/001",
    groupId: "grp-001",
    tipe: "cicilan",
    jumlah: 50000000,
    sisaTagihan: 10000000,
    status: "partial",
    jatuhTempo: "2026-05-15",
    items: [
      { id: "item-inv002-1", invoiceId: "inv-002", kategori: "Paket Umroh", deskripsi: "Cicilan ke-1 Paket Umroh per orang", qty: 4, hargaSatuan: 12500000, jumlah: 50000000, status: "active" },
    ],
    createdAt: "2026-03-01",
    updatedAt: "2026-04-10",
  },
  {
    id: "inv-003",
    nomorInvoice: "INV/GRP-00082/DP/001",
    groupId: "grp-002",
    tipe: "dp",
    jumlah: 45000000,
    sisaTagihan: 15000000,
    status: "partial",
    jatuhTempo: "2026-04-01",
    items: [
      { id: "item-inv003-1", invoiceId: "inv-003", kategori: "Paket Umroh", deskripsi: "DP Paket Umroh Reguler per orang", qty: 3, hargaSatuan: 12000000, jumlah: 36000000, status: "active" },
      { id: "item-inv003-2", invoiceId: "inv-003", kategori: "Perlengkapan", deskripsi: "Perlengkapan ihram & travel kit", qty: 3, hargaSatuan: 1500000, jumlah: 4500000, status: "active" },
      { id: "item-inv003-3", invoiceId: "inv-003", kategori: "Handling", deskripsi: "Biaya handling & administrasi", qty: 1, hargaSatuan: 4500000, jumlah: 4500000, status: "active" },
    ],
    createdAt: "2026-02-01",
    updatedAt: "2026-03-01",
  },
  {
    id: "inv-004",
    nomorInvoice: "INV/GRP-00083/DP/001",
    groupId: "grp-003",
    tipe: "dp",
    jumlah: 62500000,
    sisaTagihan: 37500000,
    status: "partial",
    jatuhTempo: "2026-03-10",
    items: [
      { id: "item-inv004-1", invoiceId: "inv-004", kategori: "Paket Umroh", deskripsi: "DP Paket Umroh Reguler per orang", qty: 5, hargaSatuan: 10000000, jumlah: 50000000, status: "active" },
      { id: "item-inv004-2", invoiceId: "inv-004", kategori: "Perlengkapan", deskripsi: "Perlengkapan ihram & travel kit", qty: 5, hargaSatuan: 1200000, jumlah: 6000000, status: "active" },
      { id: "item-inv004-3", invoiceId: "inv-004", kategori: "Administrasi", deskripsi: "Biaya administrasi & visa", qty: 5, hargaSatuan: 1300000, jumlah: 6500000, status: "active" },
    ],
    createdAt: "2026-02-10",
    updatedAt: "2026-02-25",
  },
  {
    id: "inv-005",
    nomorInvoice: "INV/GRP-00084/DP/001",
    groupId: "grp-004",
    tipe: "dp",
    jumlah: 15000000,
    sisaTagihan: 15000000,
    status: "unpaid",
    jatuhTempo: "2026-06-01",
    items: [
      { id: "item-inv005-1", invoiceId: "inv-005", kategori: "Paket Umroh", deskripsi: "DP Paket Umroh Plus Dubai", qty: 1, hargaSatuan: 10000000, jumlah: 10000000, status: "active" },
      { id: "item-inv005-2", invoiceId: "inv-005", kategori: "Perlengkapan", deskripsi: "Perlengkapan premium", qty: 1, hargaSatuan: 2500000, jumlah: 2500000, status: "active" },
      { id: "item-inv005-3", invoiceId: "inv-005", kategori: "Handling", deskripsi: "Biaya handling VIP", qty: 1, hargaSatuan: 2500000, jumlah: 2500000, status: "active" },
    ],
    createdAt: "2026-03-01",
    updatedAt: "2026-03-01",
  },
  {
    id: "inv-006",
    nomorInvoice: "INV/GRP-00085/DP/001",
    groupId: "grp-005",
    tipe: "dp",
    jumlah: 30000000,
    sisaTagihan: 30000000,
    status: "unpaid",
    jatuhTempo: "2026-06-15",
    items: [
      { id: "item-inv006-1", invoiceId: "inv-006", kategori: "Paket Umroh", deskripsi: "DP Paket Umroh Plus Dubai per orang", qty: 2, hargaSatuan: 10000000, jumlah: 20000000, status: "active" },
      { id: "item-inv006-2", invoiceId: "inv-006", kategori: "Perlengkapan", deskripsi: "Perlengkapan premium", qty: 2, hargaSatuan: 2000000, jumlah: 4000000, status: "active" },
      { id: "item-inv006-3", invoiceId: "inv-006", kategori: "Handling", deskripsi: "Biaya handling VIP", qty: 2, hargaSatuan: 3000000, jumlah: 6000000, status: "active" },
    ],
    createdAt: "2026-03-05",
    updatedAt: "2026-03-05",
  },
];

// ============================================================
// GROUP PAYMENT SUMMARIES (derived data for UI)
// ============================================================

export const mockPaymentSummaries: GroupPaymentSummary[] = mockGroups.map((grp) => {
  const anggota = mockJamaah.filter((j) => j.groupId === grp.id);
  const pembayaran = mockPembayaran.filter((p) => p.groupId === grp.id);
  const invoices = mockInvoices.filter((inv) => inv.groupId === grp.id);
  return {
    groupId: grp.id,
    kodeRegistrasi: grp.kodeRegistrasi,
    namaGroup: grp.namaGroup,
    totalTagihan: grp.totalTagihan,
    totalPembayaran: grp.totalPembayaran,
    sisaPembayaran: grp.sisaPembayaran,
    status: deriveGroupPaymentStatus(
      grp.totalTagihan,
      grp.totalPembayaran,
      grp.sisaPembayaran,
      invoices.some((inv) => inv.status === "overdue"),
    ),
    jumlahAnggota: grp.jumlahAnggota,
    anggota,
    pembayaran,
    invoices,
  };
});

// ============================================================
// DASHBOARD
// ============================================================

export const mockDashboardStats: DashboardStats = {
  totalJamaah: 15,
  totalGroup: 5,
  totalBerangkat: 3,
  dokumenLengkap: 8,
  dokumenKurang: 7,
  pembayaranLunas: 1,
  pembayaranPending: 2,
  pembayaranOverdue: 2,
  keberangkatanMendatang: 3,
};

export const mockAlerts: OperationalAlert[] = [
  {
    id: "alt-001",
    tipe: "danger",
    pesan: "3 paspor jamaah akan kadaluarsa dalam 30 hari",
    jumlahTerdampak: 3,
    module: "dokumen",
    link: "/admin/dokumen?filter=expiring",
    createdAt: new Date().toISOString(),
  },
  {
    id: "alt-002",
    tipe: "warning",
    pesan: "5 jamaah belum upload dokumen wajib (KTP & Vaksin)",
    jumlahTerdampak: 5,
    module: "dokumen",
    link: "/admin/dokumen?filter=kurang",
    createdAt: new Date().toISOString(),
  },
  {
    id: "alt-003",
    tipe: "warning",
    pesan: "Pembayaran overdue: 2 grup melewati jatuh tempo",
    jumlahTerdampak: 2,
    module: "pembayaran",
    link: "/admin/pembayaran?filter=overdue",
    createdAt: new Date().toISOString(),
  },
  {
    id: "alt-004",
    tipe: "info",
    pesan: "Keberangkatan UMRH-JUN-2026: 21 hari lagi, manifest belum final",
    jumlahTerdampak: 16,
    module: "manifest",
    link: "/admin/manifest/kbr-001",
    createdAt: new Date().toISOString(),
  },
];

// ============================================================
// REMINDERS (group-aware)
// ============================================================

export const mockReminders: Reminder[] = [
  {
    id: "rem-001",
    groupId: "grp-001",
    invoiceId: "inv-002",
    tipe: "pembayaran",
    pesan: "Yth. Keluarga Hidayat, tagihan cicilan INV/GRP-00081/CLN/001 sebesar Rp 10.000.000 akan jatuh tempo pada 15 Mei 2026. Mohon segera diselesaikan.",
    dikirimPada: "2026-05-01",
    status: "read",
  },
  {
    id: "rem-002",
    groupId: "grp-004",
    invoiceId: "inv-005",
    tipe: "pembayaran",
    pesan: "Yth. Bapak Sudrajat, tagihan DP INV/GRP-00084/DP/001 sebesar Rp 15.000.000 akan jatuh tempo pada 1 Juni 2026. Segera lakukan pembayaran.",
    dikirimPada: "2026-05-10",
    status: "sent",
  },
  {
    id: "rem-003",
    groupId: "grp-003",
    jamaahId: "jmh-009",
    tipe: "dokumen",
    pesan: "Yth. Jamaah Grup Keluarga Rahman, dokumen Paspor Anda belum diupload. Segera upload untuk proses verifikasi.",
    dikirimPada: "2026-04-20",
    status: "sent",
  },
];

// ============================================================
// MANIFEST & ROOMING (unchanged)
// ============================================================

export const mockManifests: Manifest[] = [
  {
    id: "man-001",
    keberangkatanId: "kbr-001",
    kode: "MAN/UMRH-JUN/001",
    namaManifest: "Manifest Penerbangan SV-818 — 15 Juni 2026",
    createdAt: "2026-05-01",
    updatedAt: "2026-05-20",
    status: "draft",
    data: mockJamaah.slice(0, 8).map(
      (j, i): ManifestRow => ({
        id: `mrow-${i}`,
        nomorUrut: i + 1,
        jamaahId: j.id,
        nomorPaspor: j.nomorPaspor,
        namaLengkap: j.namaLengkap,
        tempatLahir: j.tempatLahir,
        tanggalLahir: j.tanggalLahir,
        nomorKursi: `${12 + Math.floor(i / 3)}${String.fromCharCode(65 + (i % 3))}`,
        nomorKamar: `${Math.floor(i / 2) + 1}0${(i % 2) + 1}`,
      })
    ),
  },
];

export const mockRoomings: Rooming[] = [
  {
    id: "room-001",
    keberangkatanId: "kbr-001",
    hotelMekkah: "Safwa",
    hotelMadinah: "Taiba",
    hotelNama: "Safwa — Taiba",
    createdAt: "2026-05-15",
    status: "draft",
    kamar: Array.from({ length: 4 }, (_, i): Kamar => ({
      id: `kamar-${i}`,
      roomingId: "room-001",
      nomorKamar: `${10 + i}0${i % 2 + 1}`,
      tipe: (["double", "triple", "double", "quad"] as const)[i]!,
      lantai: 10 + Math.floor(i / 2),
      penghuni: mockJamaah
        .filter((j) => j.hotelMekkah === "Safwa" && j.hotelMadinah === "Taiba")
        .slice(i * 2, i * 2 + 2)
        .map((j) => ({
          jamaahId: j.id,
          namaLengkap: j.namaLengkap,
          jenisKelamin: j.jenisKelamin,
          isPasangan: i === 0,
        })),
    })),
  },
];

// ============================================================
// EXPORT HELPER: get group payment summary
// ============================================================

export function getGroupPaymentSummary(groupId: string): GroupPaymentSummary | undefined {
  return mockPaymentSummaries.find((s) => s.groupId === groupId);
}

// ============================================================
// SPLIT INVOICE DATA STORE
// ============================================================

import type { InvoiceSplitConfig } from "@/shared/types";

export const mockSplitConfigs: InvoiceSplitConfig[] = [];

export function getInvoiceSplitConfig(groupId: string): InvoiceSplitConfig | undefined {
  return mockSplitConfigs.find((c) => c.groupId === groupId);
}

export function createInvoiceSplitConfig(config: InvoiceSplitConfig): InvoiceSplitConfig {
  const existing = mockSplitConfigs.findIndex((c) => c.groupId === config.groupId);
  if (existing >= 0) {
    mockSplitConfigs[existing] = config;
  } else {
    mockSplitConfigs.push(config);
  }
  return config;
}
