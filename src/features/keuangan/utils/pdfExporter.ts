import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DepartureGroup, ExpenseRecord } from '../types';
import { formatRupiah, formatTanggalIndo } from './formatters';

export const exportExpensesToPDF = (
  expenses: ExpenseRecord[],
  groups: DepartureGroup[],
  reportTitle: string = 'LAPORAN REKAPITULASI PENGELUARAN TRAVEL UMROH',
  selectedGroupName?: string
) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(5, 150, 105); // Emerald Green
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('SAFAR TRAVEL UMROH & HAJJ', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Sistem Informasi Keuangan & Management Keberangkatan', 14, 18);

  doc.setFontSize(9);
  const dateTodayStr = new Date().toISOString().split('T')[0] || '';
  const nowStr = formatTanggalIndo(dateTodayStr);
  doc.text(`Dicetak pada: ${nowStr}`, pageWidth - 14, 18, { align: 'right' });

  // Document Title
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(reportTitle.toUpperCase(), 14, 38);

  if (selectedGroupName) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(`Filter Grup: ${selectedGroupName}`, 14, 45);
  }

  // Summary Metrics
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = expenses.reduce(
    (sum, e) => sum + (e.paymentStatus === 'Lunas' ? e.amount : e.paidAmount || 0),
    0
  );
  const totalPending = totalAmount - totalPaid;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 50, pageWidth - 28, 20, 3, 3, 'F');

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL TAGIHAN / PENGELUARAN:', 20, 58);
  doc.text('TOTAL TERBAYAR (LUNAS):', 110, 58);
  doc.text('TOTAL TENGGAT / BELUM DIBAYAR:', 200, 58);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatRupiah(totalAmount), 20, 65);

  doc.setTextColor(21, 128, 61); // Green
  doc.text(formatRupiah(totalPaid), 110, 65);

  doc.setTextColor(185, 28, 28); // Red
  doc.text(formatRupiah(totalPending), 200, 65);

  // Table Data
  const tableRows = expenses.map((exp, idx) => {
    const group = groups.find((g) => g.id === exp.groupId);
    const grpName = group ? group.name : 'Operasional Umum';
    return [
      (idx + 1).toString(),
      formatTanggalIndo(exp.transactionDate),
      exp.title,
      grpName,
      exp.category,
      exp.vendorName,
      exp.invoiceNumber || '-',
      formatRupiah(exp.amount),
      exp.paymentStatus,
      exp.paymentDeadline ? formatTanggalIndo(exp.paymentDeadline) : '-',
    ];
  });

  autoTable(doc, {
    startY: 76,
    head: [
      [
        'No',
        'Tanggal',
        'Keterangan Pengeluaran',
        'Grup Keberangkatan',
        'Kategori',
        'Vendor',
        'No. Invoice',
        'Nominal (Rp)',
        'Status',
        'Tenggat Waktu',
      ],
    ],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [5, 150, 105],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 20 },
      2: { cellWidth: 50 },
      3: { cellWidth: 45 },
      4: { cellWidth: 28 },
      5: { cellWidth: 35 },
      6: { cellWidth: 25 },
      7: { halign: 'right', fontStyle: 'bold', cellWidth: 28 },
      8: { halign: 'center', cellWidth: 18 },
      9: { halign: 'center', cellWidth: 20 },
    },
  });

  // Footer Signatures block
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : 180;
  if (finalY + 35 < doc.internal.pageSize.getHeight()) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);

    const sigX1 = 30;
    const sigX2 = pageWidth - 80;

    doc.text('Dibuat Oleh,', sigX1, finalY);
    doc.text('Disetujui Oleh,', sigX2, finalY);

    doc.text('_______________________', sigX1, finalY + 22);
    doc.text('_______________________', sigX2, finalY + 22);

    doc.text('Finance / Kasir Safar Travel', sigX1, finalY + 27);
    doc.text('Direktur Utama Safar Travel', sigX2, finalY + 27);
  }

  doc.save(`Laporan_Pengeluaran_Umroh_${new Date().toISOString().slice(0, 10)}.pdf`);
};
