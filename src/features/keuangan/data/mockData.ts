import { DepartureGroup, ExpenseRecord } from '../types';

// Generate lightweight base64 placeholder invoice & transfer proof images for demo
const createSampleInvoiceSvg = (title: string, vendor: string, amount: string, invoiceNo: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" style="background:#ffffff; font-family: sans-serif;">
    <rect width="600" height="800" fill="#f8fafc"/>
    <rect x="20" y="20" width="560" height="760" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <path d="M 20 20 L 580 20 L 580 100 L 20 100 Z" fill="#0f172a"/>
    <text x="50" y="65" font-size="24" font-weight="bold" fill="#f59e0b">INVOICE PEMBAYARAN VENDOR</text>
    <text x="50" y="85" font-size="12" fill="#cbd5e1">HARAMAIN FINANCE — TRAVEL UMROH &amp; HAJJ</text>
    
    <text x="50" y="140" font-size="14" font-weight="bold" fill="#334155">Nomor Invoice:</text>
    <text x="180" y="140" font-size="14" fill="#0f172a">${invoiceNo}</text>
    
    <text x="50" y="170" font-size="14" font-weight="bold" fill="#334155">Vendor / Supplier:</text>
    <text x="180" y="170" font-size="14" font-weight="bold" fill="#b45309">${vendor}</text>
    
    <text x="50" y="200" font-size="14" font-weight="bold" fill="#334155">Keterangan:</text>
    <text x="180" y="200" font-size="14" fill="#0f172a">${title}</text>
    
    <line x1="50" y1="230" x2="550" y2="230" stroke="#e2e8f0" stroke-width="2"/>
    
    <rect x="50" y="260" width="500" height="120" rx="8" fill="#f1f5f9"/>
    <text x="70" y="295" font-size="14" fill="#64748b">TOTAL TAGIHAN VENDOR</text>
    <text x="70" y="340" font-size="32" font-weight="bold" fill="#0f172a">${amount}</text>
    
    <rect x="50" y="410" width="500" height="180" rx="8" fill="#fafafa" stroke="#e2e8f0"/>
    <text x="70" y="440" font-size="14" font-weight="bold" fill="#334155">Rincian Layanan:</text>
    <text x="70" y="470" font-size="13" fill="#475569">• Deposit Hotel &amp; Akomodasi Jamaah</text>
    <text x="70" y="495" font-size="13" fill="#475569">• Konfirmasi Blokir Seat &amp; Booking Vouchering</text>
    <text x="70" y="520" font-size="13" fill="#475569">• Layanan Mutawwif &amp; Transportasi Ground</text>
    
    <text x="50" y="630" font-size="12" fill="#94a3b8">Status Dokumen: VERIFIED INVOICE TAGIHAN</text>
    <rect x="50" y="660" width="140" height="40" rx="20" fill="#fef3c7"/>
    <text x="120" y="685" font-size="14" font-weight="bold" fill="#92400e" text-anchor="middle">TAGIHAN RESMI</text>
    
    <circle cx="480" cy="680" r="45" fill="none" stroke="#d97706" stroke-width="3" stroke-dasharray="6,4"/>
    <text x="480" y="685" font-size="11" font-weight="bold" fill="#d97706" text-anchor="middle">OFFICIAL INVOICE</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

const createSampleTransferProofSvg = (bank: string, refNo: string, amount: string, recipient: string, date: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" style="background:#ffffff; font-family: sans-serif;">
    <rect width="600" height="800" fill="#0f172a"/>
    <rect x="25" y="25" width="550" height="750" rx="16" fill="#1e293b" stroke="#334155" stroke-width="2"/>
    
    <!-- Bank Header -->
    <rect x="25" y="25" width="550" height="110" rx="16" fill="#0284c7"/>
    <circle cx="80" cy="80" r="28" fill="#ffffff"/>
    <text x="80" y="88" font-size="22" font-weight="black" fill="#0284c7" text-anchor="middle">B</text>
    <text x="125" y="72" font-size="22" font-weight="bold" fill="#ffffff">${bank}</text>
    <text x="125" y="94" font-size="12" fill="#bae6fd">M-BANKING / INTERNET BANKING TRANSFER SLIP</text>
    
    <!-- Success Badge -->
    <circle cx="300" cy="200" r="35" fill="#10b981"/>
    <path d="M 283 200 L 295 212 L 318 188" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <text x="300" y="260" font-size="20" font-weight="extrabold" fill="#10b981" text-anchor="middle">TRANSFER BERHASIL</text>
    <text x="300" y="280" font-size="12" fill="#94a3b8" text-anchor="middle">${date} • WIB</text>
    
    <!-- Amount Card -->
    <rect x="60" y="310" width="480" height="100" rx="12" fill="#0f172a" stroke="#334155"/>
    <text x="300" y="340" font-size="12" font-weight="bold" fill="#64748b" text-anchor="middle">NOMINAL TRANSFER / BAYAR</text>
    <text x="300" y="385" font-size="30" font-weight="black" fill="#38bdf8" text-anchor="middle">${amount}</text>
    
    <!-- Details -->
    <rect x="60" y="430" width="480" height="230" rx="12" fill="#0f172a" stroke="#334155"/>
    
    <text x="85" y="465" font-size="13" fill="#94a3b8">Penerima Transfer:</text>
    <text x="240" y="465" font-size="13" font-weight="bold" fill="#f8fafc">${recipient}</text>
    
    <line x1="85" y1="485" x2="515" y2="485" stroke="#1e293b" stroke-width="1"/>
    
    <text x="85" y="515" font-size="13" fill="#94a3b8">Pengirim:</text>
    <text x="240" y="515" font-size="13" font-weight="bold" fill="#f8fafc">HARAMAIN FINANCE (REK OPERASIONAL)</text>
    
    <line x1="85" y1="535" x2="515" y2="535" stroke="#1e293b" stroke-width="1"/>
    
    <text x="85" y="565" font-size="13" fill="#94a3b8">Nomor Referensi (RRF):</text>
    <text x="240" y="565" font-size="13" font-weight="bold" fill="#38bdf8">${refNo}</text>
    
    <line x1="85" y1="585" x2="515" y2="585" stroke="#1e293b" stroke-width="1"/>
    
    <text x="85" y="615" font-size="13" fill="#94a3b8">Jenis Transaksi:</text>
    <text x="240" y="615" font-size="13" font-weight="bold" fill="#f8fafc">BI-FAST / SWIFT BANKING</text>
    
    <!-- Footer Stamp -->
    <rect x="60" y="680" width="480" height="50" rx="8" fill="#065f46" stroke="#10b981"/>
    <text x="300" y="710" font-size="13" font-weight="bold" fill="#34d399" text-anchor="middle">✔ SAH / VERIFIED OLEH BENDAHARA KEBUDAYAAN TRAVEL</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

export const INITIAL_GROUPS: DepartureGroup[] = [
  {
    id: 'grp-001',
    code: 'UMR-2026-SEP-01',
    name: 'Grup Umroh Mawaddah September 2026',
    departureDate: '2026-09-12',
    returnDate: '2026-09-21',
    totalQuota: 45,
    filledQuota: 42, // 3 sisa kursi
    targetBudget: 1250000000, // 1.25 M
    status: 'Aktif',
    packageType: 'Bintang 5 - 9 Hari (Saudia Airlines)',
    notes: 'Hotel Anjum Makkah & Pullmann Zamzam, Move Saudia CGK-JED',
    createdAt: '2026-06-01',
  },
  {
    id: 'grp-002',
    code: 'UMR-2026-OCT-01',
    name: 'Grup Umroh VIP Syawal Oktober 2026',
    departureDate: '2026-10-05',
    returnDate: '2026-10-16',
    totalQuota: 40,
    filledQuota: 31, // 9 sisa kursi
    targetBudget: 1400000000, // 1.4 M
    status: 'Aktif',
    packageType: 'Executive VIP - 12 Hari',
    notes: 'Hotel Dar Al Taqwa Madinah & Swissotel Makkah',
    createdAt: '2026-06-15',
  },
  {
    id: 'grp-003',
    code: 'UMR-2026-NOV-01',
    name: 'Grup Umroh Hemat November 2026',
    departureDate: '2026-11-20',
    returnDate: '2026-11-29',
    totalQuota: 50,
    filledQuota: 20, // 30 sisa kursi
    targetBudget: 980000000, // 980 Jt
    status: 'Direncanakan',
    packageType: 'Reguler Hemat Bintang 4 - 9 Hari',
    notes: 'Hotel Elaf Kinda Makkah & Frontel Al Harithia Madinah',
    createdAt: '2026-07-01',
  },
  {
    id: 'grp-004',
    code: 'UMR-2026-RAM-01',
    name: 'Grup Umroh Awal Ramadan 1448H',
    departureDate: '2027-02-15',
    returnDate: '2027-02-27',
    totalQuota: 60,
    filledQuota: 58, // 2 sisa kursi
    targetBudget: 2100000000, // 2.1 M
    status: 'Direncanakan',
    packageType: 'Spesial Ramadan Bintang 5',
    notes: 'Termasuk Iftaq & Sahur Hotel Fairmount Makkah Tower',
    createdAt: '2026-07-10',
  },
];

export const INITIAL_EXPENSES: ExpenseRecord[] = [
  {
    id: 'exp-001',
    title: 'Pelunasan Hotel Anjum Makkah 5 Malam',
    groupId: 'grp-001',
    groupName: 'Grup Umroh Mawaddah September 2026',
    category: 'Hotel Makkah',
    vendorName: 'Anjum Hotel Makkah Company',
    amount: 385000000,
    amountSar: 89534,
    paymentStatus: 'Lunas',
    paymentDeadline: '2026-08-01',
    paidAmount: 385000000,
    transactionDate: '2026-07-28',
    invoiceNumber: 'INV/ANJUM/2026/0891',
    invoiceImage: createSampleInvoiceSvg(
      'Pelunasan Hotel Anjum Makkah 5 Malam',
      'Anjum Hotel Makkah Company',
      'Rp 385.000.000',
      'INV/ANJUM/2026/0891'
    ),
    invoiceFileName: 'Invoice_Anjum_Makkah.png',
    transferProofImage: createSampleTransferProofSvg(
      'BANK MUAMALAT',
      'TRF-88201923-MUA',
      'Rp 385.000.000',
      'Anjum Hotel Makkah Company',
      '28 Juli 2026 14:22'
    ),
    transferProofFileName: 'Bukti_TF_Anjum_385Jt.png',
    notes: 'Transfer via Bank Muamalat Swift Code',
    createdAt: '2026-07-28',
  },
  {
    id: 'exp-002',
    title: 'DP Tiket Airline Saudia 45 Seat Jakarta - Jeddah',
    groupId: 'grp-001',
    groupName: 'Grup Umroh Mawaddah September 2026',
    category: 'Tiket Penerbangan',
    vendorName: 'Saudia Cargo & Passenger Sales ID',
    amount: 270000000,
    paymentStatus: 'DP / Partial',
    paymentDeadline: '2026-08-12', // Due soon!
    paidAmount: 150000000,
    transactionDate: '2026-07-15',
    invoiceNumber: 'SV-CGK-2026-9921',
    invoiceImage: createSampleInvoiceSvg(
      'DP Tiket Airline Saudia 45 Seat',
      'Saudia Cargo & Passenger Sales ID',
      'Rp 270.000.000',
      'SV-CGK-2026-9921'
    ),
    invoiceFileName: 'Saudia_Ticket_Deposit.png',
    transferProofImage: createSampleTransferProofSvg(
      'BANK MANDIRI',
      'TRF-99218301-MDR',
      'Rp 150.000.000',
      'Saudia Cargo & Passenger Sales ID',
      '15 Juli 2026 10:15'
    ),
    transferProofFileName: 'Bukti_TF_DP_Saudia_150Jt.png',
    notes: 'Sisa pembayaran Rp 120.000.000 wajib lunas h-30 keberangkatan',
    createdAt: '2026-07-15',
  },
  {
    id: 'exp-003',
    title: 'Biaya Penerbitan Visa Umroh & Asuransi Health 42 Pax',
    groupId: 'grp-001',
    groupName: 'Grup Umroh Mawaddah September 2026',
    category: 'Visa & Asuransi',
    vendorName: 'Muassasah Al-Mawaddah Travel KSA',
    amount: 115500000,
    paymentStatus: 'Lunas',
    paymentDeadline: '2026-08-05',
    paidAmount: 115500000,
    transactionDate: '2026-08-02',
    invoiceNumber: 'KSA-VISA-88219',
    invoiceImage: createSampleInvoiceSvg(
      'Visa Umroh & Asuransi Health 42 Pax',
      'Muassasah Al-Mawaddah Travel KSA',
      'Rp 115.500.000',
      'KSA-VISA-88219'
    ),
    invoiceFileName: 'Visa_KSA_Mawaddah.png',
    transferProofImage: createSampleTransferProofSvg(
      'BANK BSI (SYARIAH)',
      'TRF-77401928-BSI',
      'Rp 115.500.000',
      'Muassasah Al-Mawaddah Travel KSA',
      '02 Agustus 2026 11:45'
    ),
    transferProofFileName: 'Bukti_TF_Visa_KSA.png',
    notes: 'Prosedur Nusuk & Provider Visa resmi KSA',
    createdAt: '2026-08-02',
  },
  {
    id: 'exp-004',
    title: 'Pelunasan Hotel Pullman Zamzam Madinah 4 Malam',
    groupId: 'grp-002',
    groupName: 'Grup Umroh VIP Syawal Oktober 2026',
    category: 'Hotel Madinah',
    vendorName: 'Pullman Zamzam Madinah Group',
    amount: 320000000,
    paymentStatus: 'Belum Dibayar',
    paymentDeadline: '2026-08-10', // OVERDUE OR DUE VERY SOON
    paidAmount: 0,
    transactionDate: '2026-08-01',
    invoiceNumber: 'PLM-MED-2026-012',
    invoiceImage: createSampleInvoiceSvg(
      'Pelunasan Hotel Pullman Zamzam Madinah',
      'Pullman Zamzam Madinah Group',
      'Rp 320.000.000',
      'PLM-MED-2026-012'
    ),
    invoiceFileName: 'Pullman_Madinah_Invoice.png',
    notes: 'Tenggat pembayaran ketat dari Pihak Hotel Madinah',
    createdAt: '2026-08-01',
  },
  {
    id: 'exp-005',
    title: 'Sewa Bus VIP Mercedes Travego & Fast Train Haramain',
    groupId: 'grp-002',
    groupName: 'Grup Umroh VIP Syawal Oktober 2026',
    category: 'Transport Bus & Train',
    vendorName: 'Rawahel Al Mashaer Transport Co.',
    amount: 78000000,
    paymentStatus: 'DP / Partial',
    paymentDeadline: '2026-08-18',
    paidAmount: 30000000,
    transactionDate: '2026-07-20',
    invoiceNumber: 'RWH-BUS-5541',
    invoiceImage: createSampleInvoiceSvg(
      'Sewa Bus VIP & Haramain Train',
      'Rawahel Al Mashaer Transport',
      'Rp 78.000.000',
      'RWH-BUS-5541'
    ),
    invoiceFileName: 'Transport_Rawahel.png',
    transferProofImage: createSampleTransferProofSvg(
      'BANK BCA',
      'TRF-55419920-BCA',
      'Rp 30.000.000',
      'Rawahel Al Mashaer Transport Co.',
      '20 Juli 2026 16:05'
    ),
    transferProofFileName: 'Bukti_TF_DP_Bus_30Jt.png',
    notes: 'Bus AC Dingin Executive + Kereta Cepat Makkah - Madinah',
    createdAt: '2026-07-20',
  },
  {
    id: 'exp-006',
    title: 'Reimbursement Perlengkapan Koper & Ihram Jamaah (Ustadz Ridwan)',
    groupId: 'grp-001',
    groupName: 'Grup Umroh Mawaddah September 2026',
    category: 'Reimbursement',
    vendorName: 'Konveksi Perlengkapan Umroh Solo',
    amount: 46200000,
    paymentStatus: 'Lunas',
    paymentDeadline: '2026-07-25',
    paidAmount: 46200000,
    transactionDate: '2026-07-24',
    invoiceNumber: 'REIMB-KPR-091',
    invoiceImage: createSampleInvoiceSvg(
      'Koper 24 Inch, Kain Ihram & Mukena',
      'Konveksi Perlengkapan Solo',
      'Rp 46.200.000',
      'REIMB-KPR-091'
    ),
    invoiceFileName: 'Reimb_Koper.png',
    transferProofImage: createSampleTransferProofSvg(
      'BANK BCA',
      'TRF-10293812-BCA',
      'Rp 46.200.000',
      'Konveksi Perlengkapan Solo',
      '24 Juli 2026 13:40'
    ),
    transferProofFileName: 'Bukti_TF_Koper.png',
    notes: 'Reimbursement Pembelian Koper Hardcase & Perlengkapan',
    createdAt: '2026-07-24',
  },
  {
    id: 'exp-007',
    title: 'Honor Mutawwif Senior & Handling Bandara Cengkareng - Jeddah',
    groupId: 'grp-001',
    groupName: 'Grup Umroh Mawaddah September 2026',
    category: 'Mutawwif & Handling',
    vendorName: 'Handling Sahabat Safar ID & KSA',
    amount: 35000000,
    paymentStatus: 'Belum Dibayar',
    paymentDeadline: '2026-08-25',
    paidAmount: 0,
    transactionDate: '2026-08-03',
    invoiceNumber: 'HND-CGK-JED-102',
    notes: 'Pelunasan H-10 sebelum berangkat',
    createdAt: '2026-08-03',
  },
  {
    id: 'exp-008',
    title: 'Operasional & Manasik Umroh Hotel Gran Mahakam',
    groupId: undefined, // General Operational
    groupName: 'Operasional Umum Travel',
    category: 'Operasional & Marketing',
    vendorName: 'Gran Mahakam Hotel Ballroom',
    amount: 28500000,
    paymentStatus: 'Lunas',
    paymentDeadline: '2026-07-30',
    paidAmount: 28500000,
    transactionDate: '2026-07-30',
    invoiceNumber: 'GM-MANASIK-229',
    invoiceImage: createSampleInvoiceSvg(
      'Sewa Ballroom Manasik Umroh',
      'Gran Mahakam Hotel Ballroom',
      'Rp 28.500.000',
      'GM-MANASIK-229'
    ),
    invoiceFileName: 'Invoice_Gran_Mahakam.png',
    transferProofImage: createSampleTransferProofSvg(
      'BANK MANDIRI',
      'TRF-22991002-MDR',
      'Rp 28.500.000',
      'Gran Mahakam Hotel Ballroom',
      '30 Juli 2026 09:30'
    ),
    transferProofFileName: 'Bukti_TF_Gran_Mahakam.png',
    notes: 'Sewa Ballroom, Buffet Lunch & Sound System Manasik',
    createdAt: '2026-07-30',
  },
];
