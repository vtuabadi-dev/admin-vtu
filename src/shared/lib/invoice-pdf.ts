import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface InvoiceOrderItem {
  id: string;
  kategori: string;
  nama: string;
  tipe: "penambahan" | "pengurangan"; // "+" penambahan beban order, "-" pengurangan biaya order
  nominal: number;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  invoiceDate?: string;
  dueDate?: string;
  namaGroup: string;
  kodeRegistrasi: string;
  namaPaket?: string;
  tanggalBerangkat?: string;
  jenisPembayaran: string;
  nominal: number;
  metode?: string;
  bank?: string;
  nomorRekening?: string;
  catatan?: string;
  totalTagihan?: number;
  totalPembayaran?: number;
  sisaTagihan?: number;
  orderItems?: InvoiceOrderItem[];
  totalBebanTambahan?: number;
  totalPengurangan?: number;
  totalTagihanDisesuaikan?: number;
  picName?: string;
  picPhone?: string;
  picEmail?: string;
}

export function generateInvoicePdf(data: InvoicePdfData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ── 1. Top Header Banner ────────────────────────────────────
  doc.setFillColor(5, 150, 105); // Emerald Green VTU ABADI (#059669)
  doc.rect(0, 0, pageWidth, 32, "F");

  // Gold accent bar
  doc.setFillColor(217, 119, 6); // Amber Gold (#d97706)
  doc.rect(0, 32, pageWidth, 2.5, "F");

  // Company Name & Subtitle
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("PT VAUZA TAMMA ABADI", 14, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(209, 250, 229); // Light Mint
  doc.text("VTU ABADI Travel — Penyelenggara Perjalanan Ibadah Umroh & Haji Khusus", 14, 19);
  doc.text("Izin Kemenag RI No. U.412 Tahun 2020 | Website: https://vtuabadi.com", 14, 25);

  // Document Badge on top right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("INVOICE & KUITANSI", pageWidth - 14, 14, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(254, 240, 138); // Soft Gold
  doc.text(`NO: ${data.invoiceNumber}`, pageWidth - 14, 21, { align: "right" });

  const printDateStr = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  doc.text(`Tgl Cetak: ${printDateStr}`, pageWidth - 14, 27, { align: "right" });

  // ── 2. Information Cards (Billed To vs Invoice Meta) ──────────
  const startY = 42;

  // Left Card: Billed To (Data Jamaah / Group)
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.roundedRect(14, startY, 88, 42, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(5, 150, 105);
  doc.text("TAGIHAN RESMI KEPADA:", 18, startY + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(data.namaGroup || "Bapak/Ibu Jamaah", 18, startY + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Kode Registrasi : ${data.kodeRegistrasi || "-"}`, 18, startY + 20);
  doc.text(`Paket Umroh     : ${(data.namaPaket || "Paket Umroh VTU").slice(0, 32)}`, 18, startY + 26);
  if (data.picPhone || data.picEmail) {
    doc.text(`Kontak PIC       : ${data.picPhone || data.picEmail || "-"}`, 18, startY + 32);
  } else {
    doc.text(`Status Berkas   : Terdaftar di Sistem Operasional`, 18, startY + 32);
  }
  doc.text(`Tgl Berangkat   : ${data.tanggalBerangkat || "Sesuai Jadwal"}`, 18, startY + 38);

  // Right Card: Invoice Details
  doc.roundedRect(108, startY, 88, 42, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(5, 150, 105);
  doc.text("DETAIL TRANSAKSI & STATUS:", 112, startY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Tanggal Terbit  : ${data.invoiceDate || printDateStr}`, 112, startY + 13);
  doc.text(`Jatuh Tempo     : ${data.dueDate || "Sesuai Jadwal"}`, 112, startY + 19);
  doc.text(`Metode / Bank   : ${data.metode || "Transfer"} - ${data.bank || "BSI/Mandiri"}`, 112, startY + 25);
  doc.text(`No. Ref/Rek     : ${data.nomorRekening || "-"}`, 112, startY + 31);

  // Status Badge inside Right Card
  doc.setFillColor(220, 252, 231); // Green-100
  doc.setDrawColor(134, 239, 172); // Green-300
  doc.roundedRect(112, startY + 34, 45, 6, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(21, 128, 61); // Green-700
  doc.text("STATUS: TERVERIFIKASI (LUNAS)", 114, startY + 38.5);

  // ── 3. Table of Payment Items & Order Adjustments ────────────
  const tableRows: any[] = [
    [
      "1",
      `${data.jenisPembayaran || "Pembayaran Pokok Umroh"}\n${data.catatan ? `Keterangan: ${data.catatan}` : `Verifikasi Setoran Grup: ${data.namaGroup}`}`,
      data.bank ? `Transfer (${data.bank})` : "Transfer Bank",
      data.invoiceDate || printDateStr,
      `Rp ${data.nominal.toLocaleString("id-ID")}`,
    ],
  ];

  if (data.orderItems && data.orderItems.length > 0) {
    data.orderItems.forEach((item, idx) => {
      const isAdd = item.tipe === "penambahan";
      const sign = isAdd ? "+" : "-";
      tableRows.push([
        (idx + 2).toString(),
        `[${isAdd ? "TAMBAHAN BEBAN" : "PENGURANGAN/DISKON"}] ${item.nama}\nKategori: ${item.kategori.replace(/_/g, " ").toUpperCase()}`,
        isAdd ? "Penyesuaian Biaya (+)" : "Potongan Harga (-)",
        data.invoiceDate || printDateStr,
        `${sign} Rp ${item.nominal.toLocaleString("id-ID")}`,
      ]);
    });
  }

  autoTable(doc, {
    startY: startY + 48,
    head: [
      ["NO", "DESKRIPSI PEMBAYARAN / ORDER TAMBAHAN", "KATEGORI", "TANGGAL", "NOMINAL"],
    ],
    body: tableRows,
    theme: "grid",
    headStyles: {
      fillColor: [5, 150, 105],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
      halign: "left",
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 92 },
      2: { cellWidth: 32 },
      3: { cellWidth: 26 },
      4: { cellWidth: 30, halign: "right", fontStyle: "bold" },
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 5;

  // ── 4. Financial Summary Box (Right Aligned) ─────────────────
  const summaryBoxWidth = 88;
  const summaryBoxX = pageWidth - 14 - summaryBoxWidth;

  const hasAdjustments = (data.totalBebanTambahan && data.totalBebanTambahan > 0) || (data.totalPengurangan && data.totalPengurangan > 0);
  const boxHeight = hasAdjustments ? 48 : 34;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(summaryBoxX, finalY, summaryBoxWidth, boxHeight, 2, 2, "FD");

  let currentY = finalY + 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);

  doc.text("Biaya Paket Dasar:", summaryBoxX + 4, currentY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(
    `Rp ${(data.totalTagihan || data.nominal).toLocaleString("id-ID")}`,
    summaryBoxX + summaryBoxWidth - 4,
    currentY,
    { align: "right" }
  );

  if (data.totalBebanTambahan && data.totalBebanTambahan > 0) {
    currentY += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(217, 119, 6); // Amber
    doc.text("+ Tambahan Beban Order:", summaryBoxX + 4, currentY);
    doc.setFont("helvetica", "bold");
    doc.text(
      `+ Rp ${data.totalBebanTambahan.toLocaleString("id-ID")}`,
      summaryBoxX + summaryBoxWidth - 4,
      currentY,
      { align: "right" }
    );
  }

  if (data.totalPengurangan && data.totalPengurangan > 0) {
    currentY += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text("- Pengurangan / Diskon:", summaryBoxX + 4, currentY);
    doc.setFont("helvetica", "bold");
    doc.text(
      `- Rp ${data.totalPengurangan.toLocaleString("id-ID")}`,
      summaryBoxX + summaryBoxWidth - 4,
      currentY,
      { align: "right" }
    );
  }

  if (hasAdjustments) {
    currentY += 6;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Total Tagihan Disesuaikan:", summaryBoxX + 4, currentY);
    doc.text(
      `Rp ${(data.totalTagihanDisesuaikan || data.totalTagihan || data.nominal).toLocaleString("id-ID")}`,
      summaryBoxX + summaryBoxWidth - 4,
      currentY,
      { align: "right" }
    );
  }

  currentY += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Total Terbayar Sebelumnya:", summaryBoxX + 4, currentY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(
    `Rp ${(data.totalPembayaran || 0).toLocaleString("id-ID")}`,
    summaryBoxX + summaryBoxWidth - 4,
    currentY,
    { align: "right" }
  );

  // Highlight Row: Pembayaran Invoice Ini
  currentY += 2.5;
  doc.setFillColor(236, 253, 245);
  doc.rect(summaryBoxX + 2, currentY, summaryBoxWidth - 4, 7, "F");

  doc.setFont("helvetica", "bold");
  doc.setTextColor(5, 150, 105);
  doc.text("Nominal Invoice Ini:", summaryBoxX + 4, currentY + 5);
  doc.text(
    `Rp ${data.nominal.toLocaleString("id-ID")}`,
    summaryBoxX + summaryBoxWidth - 4,
    currentY + 5,
    { align: "right" }
  );

  currentY += 10;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Sisa Tagihan Setelah Ini:", summaryBoxX + 4, currentY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(data.sisaTagihan && data.sisaTagihan > 0 ? 220 : 5, data.sisaTagihan && data.sisaTagihan > 0 ? 38 : 150, data.sisaTagihan && data.sisaTagihan > 0 ? 38 : 105);
  doc.text(
    `Rp ${(data.sisaTagihan !== undefined ? data.sisaTagihan : 0).toLocaleString("id-ID")}`,
    summaryBoxX + summaryBoxWidth - 4,
    currentY,
    { align: "right" }
  );

  // ── 5. Terms & Legal Notice (Left Aligned) ────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text("CATATAN & KETENTUAN RESMI:", 14, finalY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const terms = [
    "1. Invoice & Kuitansi ini merupakan bukti penerimaan pembayaran resmi PT Vauza Tamma Abadi.",
    "2. Penambahan layanan (kereta cepat, upgrade kamar, seragam, dll) otomatis tercatat dalam sistem manifest.",
    "3. Simpan dokumen ini sebagai bukti pelunasan dan konfirmasi keberangkatan ke Baitullah.",
    "4. Pertanyaan seputar pembayaran & rincian order hubungi Finance Desk VTU: 0812-3456-7890.",
  ];
  let termY = finalY + 12;
  for (const t of terms) {
    doc.text(t, 14, termY);
    termY += 4.5;
  }

  // ── 6. Signature & Official Stamp Section ─────────────────────
  const signY = Math.max(finalY + boxHeight + 4, finalY + 38);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Diterbitkan secara digital oleh:", 14, signY);
  doc.text("Surabaya / Jakarta, Indonesia", pageWidth - 14, signY, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("Operational & Finance System", 14, signY + 6);
  doc.text("PT VAUZA TAMMA ABADI", pageWidth - 14, signY + 6, { align: "right" });

  // Digital Signature Stamp Box
  doc.setDrawColor(5, 150, 105);
  doc.setLineWidth(0.5);
  doc.roundedRect(pageWidth - 64, signY + 9, 50, 16, 1.5, 1.5, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(5, 150, 105);
  doc.text("VERIFIED & DIGITALLY SIGNED", pageWidth - 39, signY + 14.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`AUTH: VTU-${data.invoiceNumber.slice(-8)}`, pageWidth - 39, signY + 19, { align: "center" });
  doc.text("FINANCE DEPARTMENT", pageWidth - 39, signY + 22.5, { align: "center" });

  // ── 7. Footer ────────────────────────────────────────────────
  doc.setFillColor(241, 245, 249);
  doc.rect(0, pageHeight - 12, pageWidth, 12, "F");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Dokumen ini sah dan diterbitkan secara elektronik oleh Sistem Manajemen Operasional VTU ABADI Travel.",
    pageWidth / 2,
    pageHeight - 5,
    { align: "center" }
  );

  return doc;
}

export function downloadInvoicePdf(data: InvoicePdfData, customFilename?: string): void {
  const doc = generateInvoicePdf(data);
  const cleanInv = (data.invoiceNumber || "INV").replace(/[^a-zA-Z0-9-_]/g, "");
  const cleanGrp = (data.namaGroup || "Group").replace(/[^a-zA-Z0-9-_]/g, "_");
  const filename = customFilename || `Invoice-${cleanInv}-${cleanGrp}.pdf`;
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
    const filename = `Invoice-${cleanInv}-${cleanGrp}.pdf`;
    const file = new File([blob], filename, { type: "application/pdf" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: `Invoice Resmi VTU ABADI — ${data.invoiceNumber}`,
        text: `Berikut adalah invoice pembayaran resmi VTU ABADI Travel untuk ${data.namaGroup} (${data.invoiceNumber}).`,
        files: [file],
      });
      return true;
    }
  } catch (err) {
    console.warn("[shareInvoicePdf] Web Share failed:", err);
  }
  return false;
}
