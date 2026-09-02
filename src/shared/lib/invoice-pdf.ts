import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  VAUZA_TAMMA_LOGO_BASE64,
  VAUZA_TAMMA_SIGNATURE_BASE64,
  VAUZA_TAMMA_QR_BASE64,
} from "./invoice-logo";

export interface InvoiceOrderItem {
  id: string;
  kategori: string;
  nama: string;
  tipe: "penambahan" | "pengurangan"; // "+" penambahan beban order, "-" pengurangan biaya order
  nominal: number;
  qty?: number;
  hargaSatuan?: number;
}

export interface InvoicePaymentRecord {
  tanggal: string; // e.g. "11/07/2026"
  metode: string; // e.g. "TF MANDIRI"
  nominal: number; // e.g. 1000000
}

export interface InvoicePdfData {
  invoiceNumber: string; // e.g. "INV.VT/2026/VIII/00045"
  invoiceDate?: string; // e.g. "18 Juli 2026"
  idReg?: string; // e.g. "3575"
  kode?: string; // e.g. "104"
  noForm?: string;
  namaGroup: string; // e.g. "Bapak Ahmad Firdaus"
  alamat?: string;
  telepon?: string; // e.g. "0812-1234-5678"
  kodeRegistrasi: string;
  namaPaket?: string; // e.g. "Umroh Plus 12 Hari"
  tipePaket?: string; // e.g. "SILVER" | "GOLD"
  jumlahPax?: number; // e.g. 4
  hargaSatuanPaket?: number; // e.g. 25700000
  tanggalBerangkat?: string;
  hotelMekkah?: string; // e.g. "Pullman ZamZam Makkah"
  hotelMadinah?: string; // e.g. "Anwar Al Madinah Mövenpick"
  anggota?: string[]; // e.g. ["WINARJI", "FARIDATUL MAQFIROH"]
  orderItems?: InvoiceOrderItem[];
  paymentHistory?: InvoicePaymentRecord[];
  totalTagihan?: number;
  totalPembayaran?: number;
  sisaTagihan?: number;
  maksimalPelunasan?: string; // e.g. "17 Agustus 2026"
  picName?: string;
  picPhone?: string;
  picEmail?: string;
  catatan?: string;
  jenisPembayaran?: string;
  bank?: string;
  metode?: string;
  dueDate?: string;
  nominal?: number;
  totalBebanTambahan?: number;
  totalPengurangan?: number;
  totalTagihanDisesuaikan?: number;
}

const SYARAT_KETENTUAN_P1 = [
  "1. Membayar DP berarti menyetujui segala syarat dan ketentuan di bawah ini.",
  "2. Jamaah harus sudah memiliki paspor saat pendaftaran, atau selambat-lambatnya H-30 hari sebelum keberangkatan.",
  "3. Pelunasan biaya paket paling lambat H-40 sebelum tanggal keberangkatan.",
  "4. Jamaah yang berniat membatalkan keikutsertaan perjalanan umrah, harus menyampaikan pembatalannya secara tertulis kepada PT. Vauza Tamma Abadi, dan adapun rincian biaya pembatalan adalah sebagai berikut:",
  "    a. Sejak tanggal pendaftaran hingga 55 hari sebelum keberangkatan, DP Kembali 50%.",
  "    b. 50 hari sebelum keberangkatan uang DP hangus.",
  "    c. Pembatalan, pindah tanggal keberangkatan, atau pindah tangan yang dilakukan 45 hari sebelum tanggal keberangkatan dikenakan biaya administrasi sebesar biaya yang sudah dikeluarkan travel kepada vendor. Sedangkan untuk pindah tangan, yang bersangkutan wajib memiliki paspor aktif.",
  "5. Biaya paket umrah sewaktu-waktu dapat berubah dikarenakan perubahan valuta asing USD atau dikarenakan tarif penerbangan, hotel, dan lain-lain.",
  "6. Itinerary yang ada dapat berubah mengikuti kondisi yang terjadi di lapangan.",
  "7. Pembatalan secara sepihak yang dilakukan oleh jamaah dan tidak sesuai dengan kesepakatan dan ketentuan yang ditetapkan oleh pihak travel VAUZA TAMMA, maka segala pembayaran yang sudah dilakukan akan hangus atau tidak akan kembali 100%.",
  "8. Bintang/Rating yang terdapat di google/situs booking tidak sama dengan Bintang Kelas hotel tersebut. Bintang yang ditulis dalam paket merupakan Kelas Kemewahan Hotel, sedangkan Bintang/Rating yang terdapat di google/situs booking adalah Rating penilaian dari pengunjung hotel tersebut.",
  "9. Jika berkenan dan ingin memastikan kualitas serta kenyamanan hotel yang ditawarkan sebelum mendaftar, jamaah dipersilahkan mengecek review hotel yang ditawarkan di dalam paket, bisa melalui google atau situs-situs booking hotel.",
  "10. Jenis bed dan jenis kamar yang di dapat oleh jamaah termasuk ukuran kamar adalah sepenuhnya wewenang hotel. Travel hanya membantu mengatur komposisi kamar quad, triple atau double sesuai paket yang di pilih. Untuk standar kamar di Saudi berbeda dengan negara lain. Memesan kamar double, bukan berarti kamar quad yang diisi 2 orang, namun kamar double akan mendapat kamar yang biasanya lebih kecil ukurannya. Atau sebaliknya bisa jadi double mendapat kamar quad namun tetap diisi dua orang. Double (Sekamar berdua), Triple (sekamar bertiga).",
  "11. Upgrade disini adalah upgrade privasi. Penentuan jenis kamar sepenuhnya merupakan wewenang pihak hotel, tergantung ketersediaan saat check in (mohon dipahami dan ditandatangani bagian ini untuk jamaah yang memilih upgrade sekamar berdua atau bertiga).",
  "12. Segala bentuk komplain mengenai ukuran kamar dan jenis bed akan kami bantu sampaikan dan sepenuhnya menjadi wewenang pihak hotel. Marah-marah kepada pihak travel adalah salah sasaran karena hotel sepenuhnya merupakan wewenang pihak ketiga (managemen hotel).",
  "13. Fasilitas dan jumlah bed yg didapat sesuai ketersediaan hotel.",
  "14. Bagi jamaah yang pindah ke paket lain setelah H-45 hari keberangkatan akan dikenakan biaya sesuai dengan biaya yang sudah dikeluarkan travel kepada vendor.",
  "15. Segala bentuk komplain terkait makanan hotel harus langsung disampaikan kepada pihak hotel. Layanan makanan adalah tanggung jawab penuh dari pihak hotel dan berada di luar kewenangan agen travel.",
  "16. Dikarenakan keadaan saudi yang tidak menentu dan maraknya calo hotel dan pembatalan sepihak yang dilakukan oleh pihak hotel di saudi, maka tindakan penyelamatan jamaah yang dilakukan oleh pihak travel untuk menghindari jamaah terlantar adalah memindahkan hotel awal ke hotel lain yang setaraf atau upgrade dari hotel sebelumnya.",
  "17. Tanggal keberangkatan sewaktu-waktu dapat berubah disesuaikan dengan jadwal penerbangan, regulasi pemerintah Indonesia dengan negara lain, jumlah jamaah, dan lain-lain. (Jamaah pasti akan diinfo secepatnya jika ada perubahan jadwal oleh maskapai ataupun karena aturan yang terjadi disebabkan oleh peraturan kedua negara).",
  "18. Penentuan seat pesawat sepenuhnya merupakan kewenangan maskapai penerbangan. Agen travel hanya dapat mengajukan permintaan seat sesuai dengan keinginan jamaah, namun hasil pembagian seat adalah keputusan mutlak dari maskapai penerbangan.",
  "19. Tour leader bertanggung jawab mendampingi jamaah selama proses perjalanan berangkat dari indonesia hingga bandara saudi, dan pulang dari bandara saudi hingga di indonesia. Selama berada di Mekkah dan Madinah, jamaah akan dibimbing oleh tour guide atau muthawif serta tim handling di Saudi.",
  "20. Pihak travel akan berusaha untuk mendapatkan tasreh untuk akses ke Raudhah. Jika terdapat kejadian luar biasa seperti pembatasan slot tasreh maupun penutupan Raudhah dari pihak Arab Saudi, maka hal-hal tersebut di luar kendali pihak travel.",
  "21. Untuk jamaah yang tidak mendapatkan tasreh dapat mendaftarkan langsung via nusuk (dibantu oleh TL/muthowwif yg bertugas). Pendaftaran via nusuk hanya berlaku 1x satu tahun, jika jamaah sudah pernah mendaftar via nusuk harap mendaftar nusuk melalui jalur fast track (pendaftaran hanya bisa dilakukan di area masjid atau dekat dengan raudhoh).",
];

const SYARAT_KETENTUAN_P2 = [
  "22. Demi kelancaran perjalanan, jamaah yang memiliki penyakit khusus/berkebutuhan khusus/memerlukan penanganan khusus/sudah usia lanjut, wajib didampingi keluarga minimal 1 (satu) orang jamaah yang sehat selama perjalanan, dan/atau bersedia mengeluarkan biaya jasa pendamping pribadi selama program umrah.",
  "23. Layanan akomodasi (hotel), transportasi (maskapai penerbangan), dan layanan pendukung lainnya dikelola oleh pihak ketiga yang bekerja sama dengan Penyelenggara. Segala ketentuan, peraturan, maupun persyaratan khusus yang ditetapkan oleh pihak ketiga tersebut adalah di luar kontrol Penyelenggara.",
  "24. Force majeure mencakup, namun tidak terbatas pada, bencana alam, wabah, penyakit, perang, pemogokan, kerusuhan, kebijakan pemerintah, terorisme, atau kondisi darurat lain di luar kendali Penyelenggara maupun Jamaah.",
  "25. Jika terjadi force majeure yang menyebabkan perjalanan Umrah harus ditunda, dibatalkan, atau mengalami perubahan, maka:",
  "    a. Penyelenggara berhak melakukan penyesuaian jadwal, rute, maupun akomodasi sesuai dengan kondisi yang memungkinkan.",
  "    b. Penyelenggara tidak bertanggung jawab atas kerugian, klaim, atau tuntutan ganti rugi yang muncul akibat kejadian force majeure.",
  "    c. Setiap pengembalian dana (refund) atau kebijakan lain yang terkait dengan pembatalan atau perubahan perjalanan akibat force majeure akan mengikuti ketentuan masing-masing pihak ketiga (maskapai, hotel, dsb).",
  "26. Demi terciptanya suasana ibadah yang khusyuk dan nyaman, setiap jamaah diharapkan untuk selalu menjaga ketertiban, kenyamanan, dan keamanan bersama. Kedisiplinan dan kerjasama dari seluruh jamaah sangat penting demi kelancaran perjalanan umroh.",
  "27. Selama perjalanan ibadah umroh, mulai dari saat keberangkatan hingga kembali ke tanah air, jamaah diwajibkan untuk mematuhi seluruh peraturan hukum yang berlaku baik di dalam negeri maupun di negara tujuan. Tindakan yang melanggar hukum akan merugikan seluruh jamaah umroh dan dapat dikenakan sanksi sesuai peraturan yang berlaku. Kami sebagai travel juga akan mengambil tindakan yang perlu.",
  "28. Deportasi atau penolakan dari imigrasi negara setempat dengan alasan apapun, pihak travel tidak bertanggung jawab dan tidak akan ada pengembalian uang dari biaya tour atau kompensasi lainnya.",
  "29. Jamaah menyatakan mampu untuk melakukan atau memenuhi kebutuhan pribadinya sendiri, dan PT. Vauza Tamma Abadi hanya fasilitator kegiatan ini.",
  "30. Menandatangani formulir pendaftaran umrah dan melakukan pembayaran sama dengan menyepakati ketentuan-ketentuan yang tertulis di point - point sebelumnya.",
];

export function generateInvoicePdf(data: InvoicePdfData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm

  const fmtRp = (n: number) => n.toLocaleString("id-ID");

  // Derived values
  const paxCount = data.jumlahPax || data.anggota?.length || 4;
  const unitPrice = data.hargaSatuanPaket || (data.totalTagihan ? Math.round(data.totalTagihan / paxCount) : 25700000);
  const subtotalBase = unitPrice * paxCount;
  const finalTotalTagihan = data.totalTagihanDisesuaikan || data.totalTagihan || subtotalBase;
  const finalTotalBayar = data.totalPembayaran !== undefined ? data.totalPembayaran : (data.nominal || 52000000);
  const finalSisaTagihan = data.sisaTagihan !== undefined ? data.sisaTagihan : Math.max(0, finalTotalTagihan - finalTotalBayar);
  const isLunas = finalSisaTagihan <= 0;

  const GREEN: [number, number, number] = [6, 78, 59]; // #064E3B

  // ══════════════════════════════════════════════════════════════
  // PAGE 1: INVOICE RESMI PT VAUZA TAMMA ABADI (18 x 27 CM PROPORTIONS)
  // ══════════════════════════════════════════════════════════════

  // ── 1. Header: Logo (Left) + INVOICE (Right) ────────────────
  try {
    doc.addImage(VAUZA_TAMMA_LOGO_BASE64, "PNG", marginX, 12, 54, 20);
  } catch {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(6, 78, 59);
    doc.text("Vauza Tamma", marginX, 18);
    doc.setFontSize(9);
    doc.text("HAJI & UMROH", marginX, 22);
    doc.setFontSize(6.5);
    doc.setTextColor(13, 148, 136);
    doc.text("IZIN PPIU NO.U493 TAHUN 2021", marginX, 26);
  }

  // INVOICE title (right)
  doc.setFont("times", "bold");
  doc.setFontSize(26);
  doc.setTextColor(6, 78, 59);
  doc.text("INVOICE", pageWidth - marginX, 17, { align: "right" });

  // Invoice Number Green Pill Bar
  const invBarX = pageWidth - marginX - 58;
  const invBarW = 58;
  doc.setFillColor(...GREEN);
  doc.roundedRect(invBarX, 20, invBarW, 5.5, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(data.invoiceNumber || "INV.VT/2026/VIII/00045", invBarX + invBarW / 2, 23.8, { align: "center" });

  // Compact Date Table (Tanggal Invoice + Jatuh Tempo)
  const metaX = invBarX;
  const metaY = 26.5;
  const metaW = invBarW;
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.3);
  doc.roundedRect(metaX, metaY, metaW, 9.5, 1, 1, "S");

  // Row 1: Tanggal Invoice
  doc.setFillColor(...GREEN);
  doc.rect(metaX, metaY, 26, 4.75, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text("Tanggal Invoice", metaX + 2, metaY + 3.3);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(data.invoiceDate || "18 Juli 2026", metaX + 28, metaY + 3.3);

  // Row divider
  doc.line(metaX, metaY + 4.75, metaX + metaW, metaY + 4.75);

  // Row 2: Jatuh Tempo
  doc.setFillColor(...GREEN);
  doc.rect(metaX, metaY + 4.75, 26, 4.75, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Jatuh Tempo", metaX + 2, metaY + 8.1);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(data.maksimalPelunasan || data.dueDate || "17 Agustus 2026", metaX + 28, metaY + 8.1);

  // Horizontal Header Divider
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.5);
  doc.line(marginX, 38, pageWidth - marginX, 38);

  // ── 2. Two Info Boxes: Data Pendaftar + Detail Paket Umroh ──
  const boxY = 41;
  const halfW = (contentWidth - 4) / 2; // 89mm
  const valW_L = halfW - 32; // 57mm max width for Left box text values
  const valW_R = halfW - 30; // 59mm max width for Right box text values

  const lineStep = 3.4; // Height per text line in mm

  // Left Box Texts & Line Wraps
  const personDisplayName = (data.picName && data.picName.trim())
    ? data.picName.trim()
    : (data.namaGroup || "Bapak Ahmad Firdaus").replace(/^(grup|group|keluarga)\s+/i, "").trim();

  doc.setFontSize(6.8);
  const nameLinesL = doc.splitTextToSize(personDisplayName || "Bapak Ahmad Firdaus", valW_L);
  const hpStrL = data.telepon || data.picPhone || "0812-1234-5678";
  const regCodeStrL = data.kodeRegistrasi || "REG-2107-045";
  const alamatStrL = (data.alamat && data.alamat !== "-") ? data.alamat : "DSN KAUMAN, 010/006, KALIPARE, KEC. KALIPARE, KAB. MALANG";
  const alamatLinesL = doc.splitTextToSize(alamatStrL, valW_L);

  // Right Box Texts & Line Wraps
  const pkgNameStrR = data.namaPaket || "Umroh Plus 12 Hari";
  const pkgLinesR = doc.splitTextToSize(pkgNameStrR, valW_R);
  const paxStrR = `${paxCount} Pax`;
  const hotelMekkahStrR = data.hotelMekkah || "Pullman ZamZam Makkah";
  const hotelMekkahLinesR = doc.splitTextToSize(hotelMekkahStrR, valW_R);
  const hotelMadinahStrR = data.hotelMadinah || "Anwar Al Madinah Mövenpick";
  const hotelMadinahLinesR = doc.splitTextToSize(hotelMadinahStrR, valW_R);

  // Dynamic Row Heights Left
  const r1HL = Math.max(1, nameLinesL.length) * lineStep + 1.2;
  const r2HL = 1 * lineStep + 1.2;
  const r3HL = 1 * lineStep + 1.2;
  const r4HL = Math.max(1, alamatLinesL.length) * lineStep + 1.2;
  const boxH_L = 4.5 + r1HL + r2HL + r3HL + r4HL + 2;

  // Dynamic Row Heights Right
  const r1HR = Math.max(1, pkgLinesR.length) * lineStep + 1.2;
  const r2HR = 1 * lineStep + 1.2;
  const r3HR = Math.max(1, hotelMekkahLinesR.length) * lineStep + 1.2;
  const r4HR = Math.max(1, hotelMadinahLinesR.length) * lineStep + 1.2;
  const boxH_R = 4.5 + r1HR + r2HR + r3HR + r4HR + 2;

  // Final Flexible Box Height
  const boxH = Math.max(26, boxH_L, boxH_R);

  // Left: [ DATA PENDAFTAR ]━━━━━━━━━━━━━
  const dpBadgeW = 37;
  doc.setFillColor(...GREEN);
  doc.roundedRect(marginX, boxY, dpBadgeW, 4.5, 0.8, 0.8, "F");
  doc.rect(marginX, boxY + 2, dpBadgeW, 2.5, "F");

  // User icon vector in white
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(255, 255, 255);
  doc.circle(marginX + 3.2, boxY + 1.8, 0.8, "FD");
  doc.setLineWidth(0.4);
  doc.line(marginX + 2.1, boxY + 3.8, marginX + 4.3, boxY + 3.8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(255, 255, 255);
  doc.text("DATA PENDAFTAR", marginX + 5.5, boxY + 3.2);

  doc.setFillColor(...GREEN);
  doc.rect(marginX + dpBadgeW, boxY + 3.3, halfW - dpBadgeW, 1.2, "F");

  // Content Box Left
  doc.setDrawColor(183, 192, 188);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, boxY + 4.5, halfW, boxH - 4.5, 1.2, 1.2, "S");

  const dpL = marginX + 2.5;
  const dpC = marginX + 28;
  const dpV = marginX + 30;

  let curYL = boxY + 8;

  // Left Row 1: Nama
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Nama Pendaftar", dpL, curYL);
  doc.text(":", dpC, curYL);
  doc.text(nameLinesL, dpV, curYL);
  curYL += (Math.max(1, nameLinesL.length) - 1) * lineStep + 2;

  doc.setDrawColor(235, 235, 235);
  doc.line(dpL, curYL, marginX + halfW - 2.5, curYL);
  curYL += 3.5;

  // Left Row 2: No HP
  doc.text("No. HP / WhatsApp", dpL, curYL);
  doc.text(":", dpC, curYL);
  doc.setFont("helvetica", "normal");
  doc.text(hpStrL, dpV, curYL);
  curYL += 2;

  doc.line(dpL, curYL, marginX + halfW - 2.5, curYL);
  curYL += 3.5;

  // Left Row 3: Kode Registrasi
  doc.setFont("helvetica", "bold");
  doc.text("Kode Registrasi", dpL, curYL);
  doc.text(":", dpC, curYL);
  doc.text(regCodeStrL, dpV, curYL);
  curYL += 2;

  doc.line(dpL, curYL, marginX + halfW - 2.5, curYL);
  curYL += 3.5;

  // Left Row 4: Alamat
  doc.text("Alamat", dpL, curYL);
  doc.text(":", dpC, curYL);
  doc.setFont("helvetica", "normal");
  doc.text(alamatLinesL, dpV, curYL);

  // Right: [ DETAIL PAKET UMROH ]━━━━━━━━━
  const rightX = marginX + halfW + 4;
  const rpBadgeW = 41;

  doc.setFillColor(...GREEN);
  doc.roundedRect(rightX, boxY, rpBadgeW, 4.5, 0.8, 0.8, "F");
  doc.rect(rightX, boxY + 2, rpBadgeW, 2.5, "F");

  // Gift icon vector in white
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.35);
  doc.rect(rightX + 2.0, boxY + 1.8, 2.6, 2.2, "S");
  doc.line(rightX + 3.3, boxY + 1.8, rightX + 3.3, boxY + 4.0);
  doc.line(rightX + 2.0, boxY + 2.7, rightX + 4.6, boxY + 2.7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(255, 255, 255);
  doc.text("DETAIL PAKET UMROH", rightX + 5.6, boxY + 3.2);

  doc.setFillColor(...GREEN);
  doc.rect(rightX + rpBadgeW, boxY + 3.3, halfW - rpBadgeW, 1.2, "F");

  // Content Box Right
  doc.setDrawColor(183, 192, 188);
  doc.setLineWidth(0.3);
  doc.roundedRect(rightX, boxY + 4.5, halfW, boxH - 4.5, 1.2, 1.2, "S");

  const rpL = rightX + 2.5;
  const rpC = rightX + 26;
  const rpV = rightX + 28;

  let curYR = boxY + 8;

  // Right Row 1: Paket Umroh
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Paket Umroh", rpL, curYR);
  doc.text(":", rpC, curYR);
  doc.text(pkgLinesR, rpV, curYR);
  curYR += (Math.max(1, pkgLinesR.length) - 1) * lineStep + 2;

  doc.setDrawColor(235, 235, 235);
  doc.line(rpL, curYR, rightX + halfW - 2.5, curYR);
  curYR += 3.5;

  // Right Row 2: Jumlah Pendaftar
  doc.text("Jumlah Pendaftar", rpL, curYR);
  doc.text(":", rpC, curYR);
  doc.setFont("helvetica", "normal");
  doc.text(paxStrR, rpV, curYR);
  curYR += 2;

  doc.line(rpL, curYR, rightX + halfW - 2.5, curYR);
  curYR += 3.5;

  // Right Row 3: Hotel Makkah
  doc.setFont("helvetica", "bold");
  doc.text("Hotel Makkah", rpL, curYR);
  doc.text(":", rpC, curYR);
  doc.setFont("helvetica", "normal");
  doc.text(hotelMekkahLinesR, rpV, curYR);
  curYR += (Math.max(1, hotelMekkahLinesR.length) - 1) * lineStep + 2;

  doc.line(rpL, curYR, rightX + halfW - 2.5, curYR);
  curYR += 3.5;

  // Right Row 4: Hotel Madinah
  doc.setFont("helvetica", "bold");
  doc.text("Hotel Madinah", rpL, curYR);
  doc.text(":", rpC, curYR);
  doc.setFont("helvetica", "normal");
  doc.text(hotelMadinahLinesR, rpV, curYR);

  // ── 3. Table: RINCIAN PEMBAYARAN ────────────────────────────
  const t1Y = boxY + boxH + 4;
  const t1BadgeW = 38;

  doc.setFillColor(...GREEN);
  doc.roundedRect(marginX, t1Y, t1BadgeW, 4.5, 0.8, 0.8, "F");
  doc.rect(marginX, t1Y + 2, t1BadgeW, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("RINCIAN PEMBAYARAN", marginX + 3, t1Y + 3.2);

  doc.setFillColor(...GREEN);
  doc.rect(marginX + t1BadgeW, t1Y + 3.3, contentWidth - t1BadgeW, 1.2, "F");

  const table1Rows: any[] = [
    [
      "1",
      data.namaPaket || "Paket Umroh Plus 12 Hari",
      fmtRp(unitPrice),
      `${paxCount} Pax`,
      fmtRp(subtotalBase),
    ],
  ];

  autoTable(doc, {
    startY: t1Y + 4.5,
    margin: { left: marginX, right: marginX },
    head: [["No.", "Uraian", "Harga Satuan (Rp)", "Quantity", "Jumlah (Rp)"]],
    body: table1Rows,
    theme: "grid",
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [15, 23, 42],
      fontSize: 6.8,
      fontStyle: "bold",
      cellPadding: 1.5,
      lineColor: [183, 192, 188],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 74, halign: "left", fontStyle: "bold" },
      2: { cellWidth: 32, halign: "center" },
      3: { cellWidth: 24, halign: "center" },
      4: { cellWidth: 40, halign: "right", fontStyle: "bold" },
    },
    bodyStyles: {
      fontSize: 6.8,
      textColor: [15, 23, 42],
      cellPadding: 1.6,
      lineColor: [183, 192, 188],
      lineWidth: 0.3,
    },
  });

  const table1End = (doc as any).lastAutoTable.finalY;

  // ── 4. Table: RIWAYAT PEMBAYARAN ────────────────────────────
  const t2Y = table1End + 3;
  const t2BadgeW = 38;

  doc.setFillColor(...GREEN);
  doc.roundedRect(marginX, t2Y, t2BadgeW, 4.5, 0.8, 0.8, "F");
  doc.rect(marginX, t2Y + 2, t2BadgeW, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("RIWAYAT PEMBAYARAN", marginX + 3, t2Y + 3.2);

  doc.setFillColor(...GREEN);
  doc.rect(marginX + t2BadgeW, t2Y + 3.3, contentWidth - t2BadgeW, 1.2, "F");

  const historyRows: any[] = [];
  if (data.paymentHistory && data.paymentHistory.length > 0) {
    data.paymentHistory.forEach((p, idx) => {
      historyRows.push([
        `${idx + 1}`,
        p.tanggal,
        p.metode,
        fmtRp(p.nominal),
        idx === 0 ? "DP Pendaftaran" : `Pelunasan Tahap ${idx}`,
      ]);
    });
  } else {
    historyRows.push([
      "1",
      data.invoiceDate || "20 Juni 2026",
      data.bank ? `Transfer Bank ${data.bank}` : "Transfer Bank BCA",
      fmtRp(data.nominal || 20000000),
      "DP Pendaftaran",
    ]);
  }

  autoTable(doc, {
    startY: t2Y + 4.5,
    margin: { left: marginX, right: marginX },
    head: [["No.", "Tanggal", "Metode Pembayaran", "Nominal (Rp)", "Keterangan"]],
    body: historyRows,
    theme: "grid",
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [15, 23, 42],
      fontSize: 6.8,
      fontStyle: "bold",
      cellPadding: 1.5,
      lineColor: [183, 192, 188],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 30, halign: "left" },
      2: { cellWidth: 54, halign: "left" },
      3: { cellWidth: 36, halign: "center", fontStyle: "bold" },
      4: { cellWidth: 50, halign: "left" },
    },
    bodyStyles: {
      fontSize: 6.8,
      textColor: [15, 23, 42],
      cellPadding: 1.5,
      lineColor: [183, 192, 188],
      lineWidth: 0.3,
    },
  });

  const table2End = (doc as any).lastAutoTable.finalY;

  // ── 5. Summary Box (Left) + Catatan Penting (Right) ─────────
  const summaryY = table2End + 3;
  const summaryH = 22;
  const summaryW = halfW;

  // Left: Summary
  doc.setDrawColor(183, 192, 188);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, summaryY, summaryW, summaryH, 1.2, 1.2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(15, 23, 42);

  let sumY = summaryY + 4.5;
  doc.text("Total Tagihan", marginX + 3, sumY);
  doc.text(":", marginX + 36, sumY);
  doc.text(`Rp  ${fmtRp(finalTotalTagihan)}`, marginX + 39, sumY);

  sumY += 4.2;
  doc.text("Total Sudah Dibayar", marginX + 3, sumY);
  doc.text(":", marginX + 36, sumY);
  doc.text(`Rp  ${fmtRp(finalTotalBayar)}`, marginX + 39, sumY);

  sumY += 4.2;
  doc.text("Sisa Tagihan", marginX + 3, sumY);
  doc.text(":", marginX + 36, sumY);
  if (isLunas) {
    doc.setTextColor(...GREEN);
  } else {
    doc.setTextColor(220, 38, 38);
  }
  doc.text(`Rp  ${fmtRp(finalSisaTagihan)}`, marginX + 39, sumY);

  sumY += 4.5;
  doc.setTextColor(15, 23, 42);
  doc.text("Status Pembayaran", marginX + 3, sumY);
  doc.text(":", marginX + 36, sumY);

  // Status badge
  if (isLunas) {
    doc.setFillColor(...GREEN);
    doc.roundedRect(marginX + 39, sumY - 3, 16, 4, 0.8, 0.8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.text("LUNAS", marginX + 41, sumY - 0.2);
  } else {
    doc.setFillColor(234, 179, 8); // amber-500
    doc.roundedRect(marginX + 39, sumY - 3, 24, 4, 0.8, 0.8, "F");
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(6);
    doc.text("BELUM LUNAS", marginX + 40.5, sumY - 0.2);
  }

  // Right: CATATAN PENTING
  doc.setDrawColor(183, 192, 188);
  doc.roundedRect(rightX, summaryY, summaryW, summaryH, 1.2, 1.2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(15, 23, 42);
  doc.text("CATATAN PENTING", rightX + 3, summaryY + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(30, 41, 59);

  const catatanLines = [
    "• Untuk pembayaran melalui Nomor Rekening 144-00-0018881-0,",
    "  Bank MANDIRI a/n PT VAUZA TAMMA ABADI.",
    "",
    "• Setelah melakukan pembayaran, harap menginformasikan dan",
    "  mengirimkan bukti pembayaran.",
  ];

  let catY = summaryY + 8;
  for (const line of catatanLines) {
    if (line.includes("144-00") || line.includes("MANDIRI") || line.includes("VAUZA")) {
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFont("helvetica", "normal");
    }
    doc.text(line, rightX + 3, catY);
    catY += 2.6;
  }

  // ── 6. Signature + QR Verification ──────────────────────────
  const signY = summaryY + summaryH + 4;

  // Divider
  doc.setDrawColor(183, 192, 188);
  doc.setLineWidth(0.3);
  doc.line(marginX, signY - 1.5, pageWidth - marginX, signY - 1.5);

  // Left: PT VAUZA TAMMA ABADI Approval Card
  doc.setDrawColor(183, 192, 188);
  doc.roundedRect(marginX, signY, halfW, 23, 1.2, 1.2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("PT VAUZA TAMMA ABADI", marginX + halfW / 2, signY + 3.5, { align: "center" });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.5);
  doc.setTextColor(80, 80, 80);
  doc.text("Issued / Approved by", marginX + halfW / 2, signY + 6.5, { align: "center" });

  // Authentic Signature & Stamp Image
  try {
    doc.addImage(VAUZA_TAMMA_SIGNATURE_BASE64, "PNG", marginX + halfW / 2 - 17, signY + 7.5, 34, 10);
  } catch {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(2, 132, 199);
    doc.text("VAUZA TAMMA", marginX + halfW / 2, signY + 12, { align: "center" });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("H. FAISAL WAHYUDI", marginX + halfW / 2, signY + 20.5, { align: "center" });

  // Right: VERIFIKASI KEASLIAN + Authentic QR Code
  doc.setDrawColor(183, 192, 188);
  doc.roundedRect(rightX, signY, halfW, 23, 1.2, 1.2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("VERIFIKASI KEASLIAN", rightX + halfW / 2, signY + 3.5, { align: "center" });

  // Authentic QR Code Image
  try {
    doc.addImage(VAUZA_TAMMA_QR_BASE64, "PNG", rightX + halfW / 2 - 5.5, signY + 4.5, 10, 10);
  } catch {
    doc.setDrawColor(180, 180, 180);
    doc.rect(rightX + halfW / 2 - 5.5, signY + 4.5, 10, 10, "S");
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 100, 100);
  doc.text("Scan untuk memverifikasi keaslian invoice.", rightX + halfW / 2, signY + 17.5, { align: "center" });
  doc.text("Invoice ini diterbitkan secara resmi oleh PT Vauza Tamma Abadi.", rightX + halfW / 2, signY + 20, { align: "center" });

  // ── 7. Footer: Light Gray Banner (3 Alamat Kantor + Kontak) ──
  const footBoxY = pageHeight - 16;
  doc.setFillColor(229, 231, 235); // #E5E7EB
  doc.rect(marginX, footBoxY, contentWidth, 12, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  doc.setTextColor(50, 50, 50);

  const footLines = [
    "Jl. Kauman No. 21, Kauman, Klojen, Kota Malang",
    "Jl. Kemang Timur Dalam No. 18B, Bangka, Mampang Prapatan, Kota Jakarta Selatan",
    "Royal Residence Cluster Crown Hill B15 No. 61, Sumur Welut, Lakarsantri, Kota Surabaya",
  ];
  let footY = footBoxY + 3;
  for (const fl of footLines) {
    doc.text(fl, pageWidth / 2, footY, { align: "center" });
    footY += 2.2;
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("(0341) 399059 / 081-776655-000            vauzatammapremium77@gmail.com", pageWidth / 2, footY + 0.5, {
    align: "center",
  });

  // ══════════════════════════════════════════════════════════════
  // PAGE 2: SYARAT DAN KETENTUAN (POIN 1 - 21)
  // ══════════════════════════════════════════════════════════════
  doc.addPage("a4", "portrait");

  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.4);
  doc.rect(14, 14, 182, 269, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Syarat dan Ketentuan :", 18, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(30, 41, 59);

  let currentTermY = 27;
  for (const term of SYARAT_KETENTUAN_P1) {
    const lines = doc.splitTextToSize(term, 174);
    doc.text(lines, 18, currentTermY);
    currentTermY += lines.length * 3.2 + 1.2;
  }

  // ══════════════════════════════════════════════════════════════
  // PAGE 3: SYARAT DAN KETENTUAN (POIN 22 - 30)
  // ══════════════════════════════════════════════════════════════
  doc.addPage("a4", "portrait");

  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.4);
  doc.rect(14, 14, 182, 269, "S");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(30, 41, 59);

  let term3Y = 22;
  for (const term of SYARAT_KETENTUAN_P2) {
    const lines = doc.splitTextToSize(term, 174);
    doc.text(lines, 18, term3Y);
    term3Y += lines.length * 3.6 + 2;
  }

  return doc;
}

export function downloadInvoicePdf(data: InvoicePdfData, filename?: string): void {
  const doc = generateInvoicePdf(data);
  const cleanNumber = (data.invoiceNumber || "INV-VTU").replace(/[^a-zA-Z0-9-_]/g, "");
  const fname = filename || `Invoice-${cleanNumber}.pdf`;
  doc.save(fname);
}

export async function getInvoicePdfBlob(data: InvoicePdfData): Promise<Blob> {
  const doc = generateInvoicePdf(data);
  return doc.output("blob");
}

export async function shareInvoicePdf(data: InvoicePdfData): Promise<boolean> {
  try {
    const blob = await getInvoicePdfBlob(data);
    const cleanInv = (data.invoiceNumber || "INV").replace(/[^a-zA-Z0-9-_]/g, "");
    const cleanGrp = (data.namaGroup || "Group").replace(/[^a-zA-Z0-9-_]/g, "_");
    const filename = `Kwitansi-${cleanInv}-${cleanGrp}.pdf`;
    const file = new File([blob], filename, { type: "application/pdf" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: `Kwitansi & Invoice Resmi VTU ABADI — ${data.invoiceNumber}`,
        text: `Berikut adalah Kwitansi & Invoice pembayaran resmi PT Vauza Tamma Abadi untuk ${data.namaGroup} (${data.invoiceNumber}).`,
        files: [file],
      });
      return true;
    }
  } catch (err) {
    console.warn("[shareInvoicePdf] Web Share failed:", err);
  }
  return false;
}
