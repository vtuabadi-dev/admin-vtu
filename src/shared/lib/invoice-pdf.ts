import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { VAUZA_TAMMA_LOGO_BASE64 } from "./invoice-logo";

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
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2; // 186mm

  const fmtRp = (n: number) => n.toLocaleString("id-ID");

  // Derived values
  const paxCount = data.jumlahPax || data.anggota?.length || 2;
  const unitPrice = data.hargaSatuanPaket || Math.round((data.totalTagihan || 74800000) / paxCount);
  const subtotalBase = unitPrice * paxCount;
  const finalTotalTagihan = data.totalTagihanDisesuaikan || data.totalTagihan || subtotalBase;
  const finalTotalBayar = data.totalPembayaran || data.nominal || 0;
  const finalSisaTagihan = data.sisaTagihan !== undefined ? data.sisaTagihan : Math.max(0, finalTotalTagihan - finalTotalBayar);
  const isLunas = finalSisaTagihan <= 0;

  const GREEN: [number, number, number] = [22, 101, 52]; // #166534

  // ══════════════════════════════════════════════════════════════
  // PAGE 1: INVOICE RESMI PT VAUZA TAMMA ABADI
  // ══════════════════════════════════════════════════════════════

  // ── 1. Header: Logo (Left) + INVOICE (Right) ────────────────
  try {
    doc.addImage(VAUZA_TAMMA_LOGO_BASE64, "PNG", marginX, 10, 52, 20);
  } catch {
    // Fallback if logo fails to load
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("Vauza Tamma", marginX, 18);
    doc.setFontSize(9);
    doc.text("HAJI & UMROH", marginX, 22);
    doc.setFontSize(6.5);
    doc.setTextColor(13, 148, 136);
    doc.text("IZIN PPIU NO.U493 TAHUN 2021", marginX, 26);
  }

  // INVOICE title (right)
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text("INVOICE", pageWidth - marginX, 16, { align: "right" });

  // Invoice Number Green Bar
  const invBarX = pageWidth - marginX - 60;
  const invBarW = 60;
  doc.setFillColor(...GREEN);
  doc.rect(invBarX, 19, invBarW, 5.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(data.invoiceNumber || "INV.VT/2026/VIII/00045", invBarX + invBarW / 2, 23, { align: "center" });

  // Tanggal Invoice + Jatuh Tempo table
  const metaX = invBarX;
  const metaY = 25;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);

  // Tanggal Invoice row
  doc.setFillColor(240, 248, 240);
  doc.rect(metaX, metaY, 28, 5, "F");
  doc.rect(metaX + 28, metaY, invBarW - 28, 5, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...GREEN);
  doc.text("Tanggal Invoice", metaX + 2, metaY + 3.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "normal");
  doc.text(data.invoiceDate || "-", metaX + 30, metaY + 3.5);

  // Jatuh Tempo row
  doc.setFillColor(240, 248, 240);
  doc.rect(metaX, metaY + 5, 28, 5, "F");
  doc.rect(metaX + 28, metaY + 5, invBarW - 28, 5, "S");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GREEN);
  doc.text("Jatuh Tempo", metaX + 2, metaY + 8.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "normal");
  doc.text(data.maksimalPelunasan || data.dueDate || "-", metaX + 30, metaY + 8.5);

  // ── 2. Two Info Boxes: Data Pendaftar + Detail Paket Umroh ──
  const boxY = 38;
  const boxH = 28;
  const halfW = (contentWidth - 4) / 2;

  // Left: DATA PENDAFTAR
  doc.setFillColor(...GREEN);
  doc.rect(marginX, boxY, halfW, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("   DATA PENDAFTAR", marginX + 1, boxY + 3.5);

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(marginX, boxY + 5, halfW, boxH, "S");

  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  const dpLeft = marginX + 2;
  const dpValLeft = marginX + 32;
  let dpY = boxY + 9;

  doc.setFont("helvetica", "normal");
  doc.text("Nama Pendaftar", dpLeft, dpY);
  doc.text(":", dpValLeft - 2, dpY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text((data.namaGroup || "Bapak Ahmad Firdaus"), dpValLeft, dpY);

  dpY += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("No. HP / WhatsApp", dpLeft, dpY);
  doc.text(":", dpValLeft - 2, dpY);
  doc.setTextColor(15, 23, 42);
  doc.text(data.telepon || data.picPhone || "-", dpValLeft, dpY);

  dpY += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Kode Registrasi", dpLeft, dpY);
  doc.text(":", dpValLeft - 2, dpY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(data.kodeRegistrasi || "-", dpValLeft, dpY);

  dpY += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Alamat", dpLeft, dpY);
  doc.text(":", dpValLeft - 2, dpY);
  doc.setTextColor(15, 23, 42);
  const alamatStr = data.alamat || "-";
  const alamatLines = doc.splitTextToSize(alamatStr, halfW - 34);
  doc.text(alamatLines, dpValLeft, dpY);

  // Right: DETAIL PAKET UMROH
  const rightX = marginX + halfW + 4;
  doc.setFillColor(...GREEN);
  doc.rect(rightX, boxY, halfW, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("   DETAIL PAKET UMROH", rightX + 1, boxY + 3.5);

  doc.setDrawColor(200, 200, 200);
  doc.rect(rightX, boxY + 5, halfW, boxH, "S");

  doc.setFontSize(7);
  const rpLeft = rightX + 2;
  const rpValLeft = rightX + 32;
  let rpY = boxY + 9;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Paket Umroh", rpLeft, rpY);
  doc.text(":", rpValLeft - 2, rpY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(data.namaPaket || "Umroh Plus 12 Hari", rpValLeft, rpY);

  rpY += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Jumlah Pendaftar", rpLeft, rpY);
  doc.text(":", rpValLeft - 2, rpY);
  doc.setTextColor(15, 23, 42);
  doc.text(`${paxCount} Pax`, rpValLeft, rpY);

  rpY += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Hotel Makkah", rpLeft, rpY);
  doc.text(":", rpValLeft - 2, rpY);
  doc.setTextColor(15, 23, 42);
  doc.text(data.hotelMekkah || "-", rpValLeft, rpY);

  rpY += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Hotel Madinah", rpLeft, rpY);
  doc.text(":", rpValLeft - 2, rpY);
  doc.setTextColor(15, 23, 42);
  doc.text(data.hotelMadinah || "-", rpValLeft, rpY);

  // ── 3. Table: RINCIAN PEMBAYARAN ────────────────────────────
  const table1Rows: any[] = [
    [
      "1",
      data.namaPaket || "Paket Umroh Plus 12 Hari",
      fmtRp(unitPrice),
      `${paxCount} Pax`,
      fmtRp(subtotalBase),
    ],
  ];

  if (data.orderItems && data.orderItems.length > 0) {
    data.orderItems.forEach((item, idx) => {
      const isAdd = item.tipe === "penambahan";
      const sign = isAdd ? "" : "-";
      const itemQty = item.qty || paxCount || 1;
      const itemUnit = item.hargaSatuan || Math.round(item.nominal / itemQty);
      table1Rows.push([
        `${idx + 2}`,
        item.nama,
        `${sign}${fmtRp(itemUnit)}`,
        `${itemQty}`,
        `${sign}${fmtRp(item.nominal)}`,
      ]);
    });
  }

  autoTable(doc, {
    startY: boxY + boxH + 8,
    margin: { left: marginX, right: marginX },
    head: [
      [
        { content: "RINCIAN PEMBAYARAN", colSpan: 5, styles: { halign: "left", fillColor: GREEN, textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold", cellPadding: 2 } },
      ],
      ["No.", "Uraian", "Harga Satuan (Rp)", "Quantity", "Jumlah (Rp)"],
    ],
    body: table1Rows,
    theme: "grid",
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [50, 50, 50],
      fontSize: 7,
      fontStyle: "bold",
      cellPadding: 1.5,
      lineColor: [200, 200, 200],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 72, halign: "left" },
      2: { cellWidth: 34, halign: "right" },
      3: { cellWidth: 24, halign: "center" },
      4: { cellWidth: 44, halign: "right", fontStyle: "bold" },
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [15, 23, 42],
      cellPadding: 1.5,
      lineColor: [200, 200, 200],
    },
  });

  const table1End = (doc as any).lastAutoTable.finalY;

  // ── 4. Table: RIWAYAT PEMBAYARAN ────────────────────────────
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
    const tglStr = data.invoiceDate || new Date().toLocaleDateString("id-ID");
    const bankStr = data.bank ? `Transfer Bank ${data.bank}` : "Transfer Bank Mandiri";
    historyRows.push([
      "1",
      tglStr,
      bankStr,
      fmtRp(data.nominal || 0),
      "DP Pendaftaran",
    ]);
  }

  autoTable(doc, {
    startY: table1End + 3,
    margin: { left: marginX, right: marginX },
    head: [
      [
        { content: "RIWAYAT PEMBAYARAN", colSpan: 5, styles: { halign: "left", fillColor: GREEN, textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold", cellPadding: 2 } },
      ],
      ["No.", "Tanggal", "Metode Pembayaran", "Nominal (Rp)", "Keterangan"],
    ],
    body: historyRows,
    theme: "grid",
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [50, 50, 50],
      fontSize: 7,
      fontStyle: "bold",
      cellPadding: 1.5,
      lineColor: [200, 200, 200],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 28, halign: "left" },
      2: { cellWidth: 52, halign: "left" },
      3: { cellWidth: 36, halign: "right", fontStyle: "bold" },
      4: { cellWidth: 58, halign: "left" },
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [15, 23, 42],
      cellPadding: 1.5,
      lineColor: [200, 200, 200],
    },
  });

  const table2End = (doc as any).lastAutoTable.finalY;

  // ── 5. Summary Box (Left) + Catatan Penting (Right) ─────────
  const summaryY = table2End + 4;
  const summaryH = 24;
  const summaryW = halfW;

  // Left: Summary
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(marginX, summaryY, summaryW, summaryH, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);

  let sumY = summaryY + 5;
  doc.text("Total Tagihan", marginX + 3, sumY);
  doc.text(":", marginX + 38, sumY);
  doc.setTextColor(15, 23, 42);
  doc.text(`Rp  ${fmtRp(finalTotalTagihan)}`, marginX + 41, sumY);

  sumY += 4.5;
  doc.setTextColor(60, 60, 60);
  doc.text("Total Sudah Dibayar", marginX + 3, sumY);
  doc.text(":", marginX + 38, sumY);
  doc.setTextColor(15, 23, 42);
  doc.text(`Rp  ${fmtRp(finalTotalBayar)}`, marginX + 41, sumY);

  sumY += 4.5;
  doc.setTextColor(60, 60, 60);
  doc.text("Sisa Tagihan", marginX + 3, sumY);
  doc.text(":", marginX + 38, sumY);
  if (isLunas) {
    doc.setTextColor(...GREEN);
  } else {
    doc.setTextColor(220, 38, 38);
  }
  doc.setFont("helvetica", "bold");
  doc.text(`Rp  ${fmtRp(finalSisaTagihan)}`, marginX + 41, sumY);

  sumY += 5;
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "bold");
  doc.text("Status Pembayaran", marginX + 3, sumY);
  doc.text(":", marginX + 38, sumY);

  // Status badge
  if (isLunas) {
    doc.setFillColor(220, 252, 231); // green-100
    doc.roundedRect(marginX + 41, sumY - 3, 18, 4.5, 1, 1, "F");
    doc.setTextColor(...GREEN);
    doc.text("LUNAS", marginX + 42, sumY);
  } else {
    doc.setFillColor(254, 226, 226); // red-100
    doc.roundedRect(marginX + 41, sumY - 3, 26, 4.5, 1, 1, "F");
    doc.setTextColor(220, 38, 38);
    doc.text("BELUM LUNAS", marginX + 42, sumY);
  }

  // Right: CATATAN PENTING
  doc.setFillColor(...GREEN);
  doc.rect(rightX, summaryY, summaryW, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("CATATAN PENTING", rightX + 2, summaryY + 3.5);

  doc.setDrawColor(200, 200, 200);
  doc.rect(rightX, summaryY + 5, summaryW, summaryH - 5, "S");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(50, 50, 50);

  const catatanLines = [
    "• Untuk pembayaran melalui Nomor Rekening",
    "  144-00-0018881-0, Bank MANDIRI",
    "  a/n PT VAUZA TAMMA ABADI.",
    "",
    "• Setelah melakukan pembayaran, harap",
    "  menginformasikan dan mengirimkan",
    "  bukti pembayaran.",
  ];

  let catY = summaryY + 9;
  for (const line of catatanLines) {
    if (line.includes("144-00") || line.includes("MANDIRI") || line.includes("VAUZA")) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
    }
    doc.text(line, rightX + 2, catY);
    catY += 2.5;
  }

  // ── 6. Signature + QR Verification ──────────────────────────
  const signY = summaryY + summaryH + 6;

  // Line separator
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(marginX, signY - 2, pageWidth - marginX, signY - 2);

  // Left: Signature
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("PT VAUZA TAMMA ABADI", marginX, signY);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("Issued / Approved by", marginX, signY + 4);

  // Logo stamp
  try {
    doc.addImage(VAUZA_TAMMA_LOGO_BASE64, "PNG", marginX, signY + 6, 30, 12);
  } catch {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(2, 132, 199);
    doc.text("VAUZA TAMMA", marginX + 5, signY + 13);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("H. FAISAL WAHYUDI", marginX, signY + 22);

  // Right: QR Code Verification
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("VERIFIKASI KEASLIAN", pageWidth - marginX - 55, signY);

  // QR Placeholder Box
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(pageWidth - marginX - 55, signY + 2, 16, 16, "S");

  // Simple QR-like pattern inside
  doc.setFillColor(80, 80, 80);
  doc.rect(pageWidth - marginX - 53, signY + 4, 5, 5, "F");
  doc.rect(pageWidth - marginX - 45, signY + 4, 5, 5, "F");
  doc.rect(pageWidth - marginX - 53, signY + 12, 5, 5, "F");
  doc.rect(pageWidth - marginX - 49, signY + 8, 3, 3, "F");
  doc.rect(pageWidth - marginX - 45, signY + 12, 2, 2, "F");
  doc.rect(pageWidth - marginX - 42, signY + 14, 2, 3, "F");

  // QR description
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  const qrDescLines = doc.splitTextToSize(
    "Scan untuk memverifikasi keaslian invoice. Invoice ini diterbitkan secara resmi oleh PT Vauza Tamma Abadi.",
    34
  );
  doc.text(qrDescLines, pageWidth - marginX - 36, signY + 5);

  // ── 7. Footer: Office Addresses ─────────────────────────────
  const footBoxY = pageHeight - 18;
  doc.setFillColor(...GREEN);
  doc.rect(marginX, footBoxY, contentWidth, 14, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);

  const footLines = [
    "Jl. Kauman No. 21, Kauman, Klojen, Kota Malang",
    "Jl. Kemang Timur Dalam No. 18B, Bangka, Mampang Prapatan, Kota Jakarta Selatan",
    "Royal Residence Cluster Crown Hill B15 No. 61, Sumur Welut, Lakarsantri, Kota Surabaya",
  ];
  let footY = footBoxY + 3.5;
  for (const fl of footLines) {
    doc.text(fl, pageWidth / 2, footY, { align: "center" });
    footY += 2.5;
  }

  doc.setFont("helvetica", "bold");
  doc.text("(0341) 399059 / 081-776655-000            vauzatammapremium77@gmail.com", pageWidth / 2, footY + 0.5, {
    align: "center",
  });

  // ══════════════════════════════════════════════════════════════
  // PAGE 2: SYARAT DAN KETENTUAN (POIN 1 - 21)
  // ══════════════════════════════════════════════════════════════
  doc.addPage("a4", "portrait");

  // Outer Border
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

export function downloadInvoicePdf(data: InvoicePdfData, customFilename?: string): void {
  const doc = generateInvoicePdf(data);
  const cleanInv = (data.invoiceNumber || "INV").replace(/[^a-zA-Z0-9-_]/g, "");
  const cleanGrp = (data.namaGroup || "Group").replace(/[^a-zA-Z0-9-_]/g, "_");
  const filename = customFilename || `Kwitansi-${cleanInv}-${cleanGrp}.pdf`;
  doc.save(filename);
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
