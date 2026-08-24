import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  invoiceNumber: string; // e.g. "3987/INV.VT/VIII/2026"
  invoiceDate?: string; // e.g. "24/08/2026"
  idReg?: string; // e.g. "3575"
  kode?: string; // e.g. "104"
  noForm?: string;
  namaGroup: string; // e.g. "FARIDATUL MAQFIROH"
  alamat?: string; // e.g. "DSN KAUMAN, 010/006, KALIPARE, KEC. KALIPARE, KAB. MALANG / JAWA TIMUR"
  telepon?: string; // e.g. "+62 812-3370-2021"
  kodeRegistrasi: string;
  namaPaket?: string; // e.g. "PAKET UMROH 10 H SBY ( JED.C ) - 16 Okt 2026 (SV)"
  tipePaket?: string; // e.g. "SILVER" | "GOLD"
  jumlahPax?: number; // e.g. 2
  hargaSatuanPaket?: number; // e.g. 37400000
  tanggalBerangkat?: string;
  hotelMekkah?: string; // e.g. "GRAND AL MASSA"
  hotelMadinah?: string; // e.g. "DURRAT AL EIMAN"
  anggota?: string[]; // e.g. ["WINARJI", "FARIDATUL MAQFIROH"]
  orderItems?: InvoiceOrderItem[];
  paymentHistory?: InvoicePaymentRecord[];
  totalTagihan?: number;
  totalPembayaran?: number;
  sisaTagihan?: number;
  maksimalPelunasan?: string; // e.g. "6 September 2026"
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

  // ══════════════════════════════════════════════════════════════
  // PAGE 1: KWITANSI RESMI VAUZA TAMMA
  // ══════════════════════════════════════════════════════════════

  // ── 1. Top Header: Logo & Company (Left) ─────────────────────
  // Logo Circle Accent Graphic
  doc.setDrawColor(220, 38, 38); // Red
  doc.setLineWidth(0.8);
  doc.circle(20, 16, 4.5, "S");
  doc.setDrawColor(5, 150, 105); // Green
  doc.circle(23, 17, 3.5, "S");
  doc.setDrawColor(37, 99, 235); // Blue
  doc.circle(18, 18, 3.5, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("Vauza Tamma", 30, 15);

  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text("HAJI & UMROH", 30, 19.5);

  doc.setFontSize(6.5);
  doc.setTextColor(13, 148, 136); // Teal
  doc.text("IZIN PPIU NO.U493 TAHUN 2021", 30, 23.5);

  // ── Top Header: Kwitansi Box (Right) ─────────────────────────
  const kwitansiX = 138;
  const kwitansiWidth = 58;

  doc.setFont("times", "bold");
  doc.setFontSize(17);
  doc.setTextColor(15, 23, 42);
  doc.text("KWITANSI", kwitansiX + kwitansiWidth / 2, 13.5, { align: "center" });

  // Green Invoice Number Box
  doc.setFillColor(22, 101, 52); // Dark Green #166534
  doc.rect(kwitansiX, 15.5, kwitansiWidth, 5.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(data.invoiceNumber || "3987/INV.VT/VIII/2026", kwitansiX + kwitansiWidth / 2, 19.3, {
    align: "center",
  });

  // Metadata Table (TANGGAL, ID REG, KODE, NO. FORM)
  const metaY = 21;
  const metaH = 15;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(kwitansiX, metaY, kwitansiWidth, metaH, "S");

  // Grid lines
  doc.line(kwitansiX, metaY + 3.8, kwitansiX + kwitansiWidth, metaY + 3.8);
  doc.line(kwitansiX, metaY + 7.6, kwitansiX + kwitansiWidth, metaY + 7.6);
  doc.line(kwitansiX, metaY + 11.4, kwitansiX + kwitansiWidth, metaY + 11.4);
  doc.line(kwitansiX + 22, metaY, kwitansiX + 22, metaY + metaH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(50, 50, 50);

  doc.text("TANGGAL", kwitansiX + 2, metaY + 2.8);
  doc.text(":", kwitansiX + 20, metaY + 2.8);
  doc.setFont("helvetica", "normal");
  doc.text(data.invoiceDate || new Date().toLocaleDateString("id-ID"), kwitansiX + 24, metaY + 2.8);

  doc.setFont("helvetica", "bold");
  doc.text("ID REG", kwitansiX + 2, metaY + 6.6);
  doc.text(":", kwitansiX + 20, metaY + 6.6);
  doc.setFont("helvetica", "normal");
  doc.text(data.idReg || data.kodeRegistrasi?.replace(/[^0-9]/g, "").slice(-4) || "3575", kwitansiX + 24, metaY + 6.6);

  doc.setFont("helvetica", "bold");
  doc.text("KODE", kwitansiX + 2, metaY + 10.4);
  doc.text(":", kwitansiX + 20, metaY + 10.4);
  doc.setFont("helvetica", "normal");
  doc.text(data.kode || data.kodeRegistrasi?.slice(-3) || "104", kwitansiX + 24, metaY + 10.4);

  doc.setFont("helvetica", "bold");
  doc.text("NO. FORM", kwitansiX + 2, metaY + 14.2);
  doc.text(":", kwitansiX + 20, metaY + 14.2);
  doc.setFillColor(22, 101, 52);
  doc.rect(kwitansiX + 23, metaY + 11.8, kwitansiWidth - 24, 2.8, "F");

  // ── 2. Information Block: Kepada Yth Bapak/Ibu ──────────────
  const infoY = 38;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);

  doc.text("Kepada", marginX, infoY);
  doc.text("Yth Bapak/ Ibu", marginX, infoY + 4.5);

  doc.text("Nama", marginX, infoY + 9.5);
  doc.text(":", marginX + 26, infoY + 9.5);
  doc.setFont("helvetica", "bold");
  doc.text((data.namaGroup || data.picName || "BAPAK/IBU JAMAAH").toUpperCase(), marginX + 30, infoY + 9.5);

  doc.setFont("helvetica", "normal");
  doc.text("Alamat", marginX, infoY + 14);
  doc.text(":", marginX + 26, infoY + 14);
  const alamatStr = data.alamat || "DSN KAUMAN, 010/006, KALIPARE, KEC. KALIPARE, KAB. MALANG";
  const telpStr = data.telepon || data.picPhone ? ` / ${data.telepon || data.picPhone}` : "";
  doc.text(`${alamatStr}${telpStr}`, marginX + 30, infoY + 14);

  doc.setFont("helvetica", "bold");
  doc.text("Paket Umroh", marginX, infoY + 19.5);
  doc.text(":", marginX + 26, infoY + 19.5);
  const paketNama = (data.namaPaket || "PAKET UMROH VTU ABADI").toUpperCase();
  const tipeStr = data.tipePaket ? `( ${data.tipePaket.toUpperCase()} )` : "( REGULER )";
  doc.text(`${paketNama}`, marginX + 30, infoY + 19.5);
  doc.text(tipeStr, pageWidth - marginX - 22, infoY + 19.5);

  doc.text("Jumlah", marginX, infoY + 24.5);
  doc.text(":", marginX + 26, infoY + 24.5);
  const paxCount = data.jumlahPax || data.anggota?.length || 2;
  doc.text(`${paxCount} Pax`, marginX + 30, infoY + 24.5);

  // ── 3. Table 1: Rincian Paket & Tagihan ──────────────────────
  const unitPrice = data.hargaSatuanPaket || Math.round((data.totalTagihan || 74800000) / paxCount);
  const subtotalBase = unitPrice * paxCount;

  const table1Rows: any[] = [
    [
      `${paketNama} ${tipeStr}`,
      `Rp  ${unitPrice.toLocaleString("id-ID")}`,
      `${paxCount}`,
      `Rp  ${subtotalBase.toLocaleString("id-ID")}`,
    ],
  ];

  // Additional Order Items / Adjustments (Upgrade Kamar, Diskon, dll)
  if (data.orderItems && data.orderItems.length > 0) {
    data.orderItems.forEach((item) => {
      const isAdd = item.tipe === "penambahan";
      const sign = isAdd ? "" : "-";
      const itemQty = item.qty || paxCount || 1;
      const itemUnit = item.hargaSatuan || Math.round(item.nominal / itemQty);
      table1Rows.push([
        item.nama.toUpperCase(),
        `${sign}Rp  ${itemUnit.toLocaleString("id-ID")}`,
        `${itemQty}`,
        `${sign}Rp  ${(item.nominal).toLocaleString("id-ID")}`,
      ]);
    });
  }

  // Anggota Jamaah Section (A/N)
  if (data.anggota && data.anggota.length > 0) {
    table1Rows.push(["A/N", "", "", "Rp  -"]);
    data.anggota.forEach((nama, idx) => {
      table1Rows.push([`${idx + 1}. ${nama.toUpperCase()}`, "", "", "Rp  -"]);
    });
  }

  // Hotel Makkah & Madinah Information
  table1Rows.push(["", "", "", "Rp  -"]);
  table1Rows.push([`HOTEL MAKKAH: ${data.hotelMekkah ? data.hotelMekkah.toUpperCase() : "GRAND AL MASSA"}`, "", "", "Rp  -"]);
  table1Rows.push([`HOTEL MADINAH: ${data.hotelMadinah ? data.hotelMadinah.toUpperCase() : "DURRAT AL EIMAN"}`, "", "", "Rp  -"]);
  table1Rows.push(["", "", "", "Rp  -"]);

  const finalTotalTagihan = data.totalTagihanDisesuaikan || data.totalTagihan || subtotalBase;

  autoTable(doc, {
    startY: infoY + 28,
    margin: { left: marginX, right: marginX },
    head: [["Keterangan", "Harga", "Qty", "Subtotal"]],
    body: table1Rows,
    foot: [["Total Tagihan", "", "", `Rp  ${finalTotalTagihan.toLocaleString("id-ID")}`]],
    theme: "grid",
    headStyles: {
      fillColor: [22, 101, 52], // Dark Green #166534
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
      halign: "center",
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 104, halign: "left", fontStyle: "normal" },
      1: { cellWidth: 32, halign: "right", fontStyle: "normal" },
      2: { cellWidth: 14, halign: "center", fontStyle: "normal" },
      3: { cellWidth: 32, halign: "right", fontStyle: "normal" },
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [15, 23, 42],
      fontSize: 8.5,
      fontStyle: "bold",
      halign: "center",
      cellPadding: 2.2,
      lineWidth: 0.3,
      lineColor: [180, 180, 180],
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [15, 23, 42],
      cellPadding: 1.6,
      lineColor: [180, 180, 180],
    },
    didParseCell: function (dataHook) {
      if (dataHook.section === "foot" && dataHook.column.index === 0) {
        dataHook.cell.styles.halign = "center";
      }
      if (dataHook.section === "foot" && dataHook.column.index === 3) {
        dataHook.cell.styles.halign = "right";
      }
    },
  });

  const table1End = (doc as any).lastAutoTable.finalY;

  // ── 4. Table 2: Rincian Pembayaran (History) ─────────────────
  const historyRows: any[] = [];
  if (data.paymentHistory && data.paymentHistory.length > 0) {
    data.paymentHistory.forEach((p) => {
      historyRows.push([`${p.tanggal} ${p.metode.toUpperCase()}`, `Rp  ${p.nominal.toLocaleString("id-ID")}`]);
    });
  } else {
    // Default current verified payment
    const tglStr = data.invoiceDate || new Date().toLocaleDateString("id-ID");
    const bankStr = data.bank ? `TF ${data.bank.toUpperCase()}` : "TF MANDIRI";
    historyRows.push([`${tglStr} ${bankStr}`, `Rp  ${(data.nominal || 10000000).toLocaleString("id-ID")}`]);
  }

  // Padding empty rows like original template
  while (historyRows.length < 4) {
    historyRows.push(["", ""]);
  }

  const finalTotalBayar = data.totalPembayaran || data.nominal || 10000000;
  const finalKurangBayar = data.sisaTagihan !== undefined ? data.sisaTagihan : Math.max(0, finalTotalTagihan - finalTotalBayar);

  autoTable(doc, {
    startY: table1End + 3,
    margin: { left: marginX, right: marginX },
    head: [[{ content: "Rincian Pembayaran", colSpan: 2, styles: { halign: "center" } }]],
    body: historyRows,
    foot: [
      ["Total Bayar", `Rp ${finalTotalBayar.toLocaleString("id-ID")}`],
      ["Kurang Bayar", `Rp  ${finalKurangBayar.toLocaleString("id-ID")}`],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [22, 101, 52],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 150, halign: "left" },
      1: { cellWidth: 32, halign: "right" },
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [15, 23, 42],
      fontSize: 8,
      fontStyle: "bold",
      cellPadding: 1.8,
      lineWidth: 0.3,
      lineColor: [180, 180, 180],
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [15, 23, 42],
      cellPadding: 1.5,
      lineColor: [180, 180, 180],
    },
    didParseCell: function (dataHook) {
      if (dataHook.section === "foot" && dataHook.column.index === 0) {
        dataHook.cell.styles.halign = "center";
      }
      if (dataHook.section === "foot" && dataHook.column.index === 1) {
        dataHook.cell.styles.halign = "right";
      }
    },
  });

  const table2End = (doc as any).lastAutoTable.finalY;

  // ── 5. NB: Maksimal Pelunasan ────────────────────────────────
  const nbY = table2End + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(220, 38, 38); // Red
  doc.text("NB :", marginX, nbY);

  doc.setTextColor(15, 23, 42);
  doc.text("MAKSIMAL PELUNASAN TANGGAL =", marginX + 7, nbY);
  doc.text(data.maksimalPelunasan || data.dueDate || "6 September 2026", marginX + 68, nbY);

  // ── 6. Signatures (Issued Approve vs Accept) ─────────────────
  const signY = nbY + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  doc.text("PT VAUZA TAMMA ABADI", marginX, signY);
  doc.text("Issued Approve by", marginX, signY + 3.8);

  doc.text("Accept by", pageWidth - marginX - 45, signY);

  // Signature / Seal Stamp Representation
  doc.setDrawColor(2, 132, 199); // Light Blue Signature Graphic
  doc.setLineWidth(0.6);
  doc.ellipse(marginX + 18, signY + 12, 16, 5, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(2, 132, 199);
  doc.text("VAUZA TAMMA", marginX + 7, signY + 13.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("H. FAISAL WAHYUDI", marginX, signY + 22);

  doc.text((data.namaGroup || data.picName || "MIA HERAWATI").toUpperCase(), pageWidth - marginX - 45, signY + 22);

  // ── 7. Green Bank Account Footer Box ─────────────────────────
  const footBoxY = pageHeight - 24;
  doc.setFillColor(22, 101, 52); // #166534
  doc.rect(marginX, footBoxY, contentWidth, 18, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("Untuk pembayaran melalui rekening bank sebagai berikut :", pageWidth / 2, footBoxY + 4, {
    align: "center",
  });

  doc.setFontSize(7);
  doc.text(
    "Nomor Rekening 144-00-0018881-0, Bank MANDIRI a/n PT VAUZA TAMMA ABADI",
    pageWidth / 2,
    footBoxY + 8,
    { align: "center" }
  );

  doc.setFont("helvetica", "normal");
  doc.text("Pelunasan biaya paket paling lambat H-40 sebelum tanggal keberangkatan", pageWidth / 2, footBoxY + 12, {
    align: "center",
  });
  doc.text("Setelah melakukan pembayaran, harap menginformasikan dan mengirimkan bukti pembayaran", pageWidth / 2, footBoxY + 15.5, {
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
