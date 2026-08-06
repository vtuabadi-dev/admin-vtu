import * as XLSX from 'xlsx';
import { DepartureGroup, ExpenseRecord } from '../types';
import { getDaysDiff } from './formatters';

export const exportExpensesToExcel = (
  expenses: ExpenseRecord[],
  groups: DepartureGroup[]
) => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Detail Pengeluaran
  const expenseRows = expenses.map((exp, idx) => {
    const grp = groups.find((g) => g.id === exp.groupId);
    return {
      'No': idx + 1,
      'Tanggal Transaksi': exp.transactionDate,
      'Keterangan Pengeluaran': exp.title,
      'Grup Keberangkatan': grp ? grp.name : 'Operasional Umum',
      'Kode Grup': grp ? grp.code : '-',
      'Kategori': exp.category,
      'Nama Vendor / Supplier': exp.vendorName,
      'Nominal (IDR)': exp.amount,
      'Terbayar (IDR)': exp.paymentStatus === 'Lunas' ? exp.amount : exp.paidAmount || 0,
      'Sisa Tagihan (IDR)': exp.amount - (exp.paymentStatus === 'Lunas' ? exp.amount : exp.paidAmount || 0),
      'Status Pembayaran': exp.paymentStatus,
      'Tenggat Waktu Vendor': exp.paymentDeadline || '-',
      'Nomor Invoice': exp.invoiceNumber || '-',
      'Catatan': exp.notes || '-',
    };
  });

  const wsExpenses = XLSX.utils.json_to_sheet(expenseRows);
  // Auto width columns
  wsExpenses['!cols'] = [
    { wch: 5 },  // No
    { wch: 15 }, // Tanggal
    { wch: 35 }, // Keterangan
    { wch: 30 }, // Grup
    { wch: 18 }, // Kode
    { wch: 22 }, // Kategori
    { wch: 28 }, // Vendor
    { wch: 18 }, // Nominal
    { wch: 18 }, // Terbayar
    { wch: 18 }, // Sisa
    { wch: 16 }, // Status
    { wch: 16 }, // Tenggat
    { wch: 20 }, // Invoice
    { wch: 30 }, // Catatan
  ];

  XLSX.utils.book_append_sheet(wb, wsExpenses, 'Detail Pengeluaran');

  // Sheet 2: Ringkasan Grup Keberangkatan & Sisa Kuota
  const groupRows = groups.map((grp, idx) => {
    const groupExpenses = expenses.filter((e) => e.groupId === grp.id);
    const totalActual = groupExpenses.reduce((sum, e) => sum + e.amount, 0);
    const remainingBudget = grp.targetBudget - totalActual;
    const remainingSeats = grp.totalQuota - grp.filledQuota;
    const quotaPercent = Math.round((grp.filledQuota / grp.totalQuota) * 100);

    return {
      'No': idx + 1,
      'Kode Grup': grp.code,
      'Nama Grup Keberangkatan': grp.name,
      'Paket': grp.packageType,
      'Tanggal Keberangkatan': grp.departureDate,
      'Tanggal Kepulangan': grp.returnDate,
      'Total Kuota (Seat)': grp.totalQuota,
      'Jamaah Terisi': grp.filledQuota,
      'Sisa Kuota Kursi': remainingSeats,
      'Persentase Terisi (%)': `${quotaPercent}%`,
      'Target Budget (IDR)': grp.targetBudget,
      'Total Pengeluaran Actual (IDR)': totalActual,
      'Sisa Budget (IDR)': remainingBudget,
      'Status Grup': grp.status,
      'Catatan': grp.notes || '-',
    };
  });

  const wsGroups = XLSX.utils.json_to_sheet(groupRows);
  wsGroups['!cols'] = [
    { wch: 5 },
    { wch: 18 },
    { wch: 35 },
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 15 },
    { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(wb, wsGroups, 'Grup & Sisa Kuota');

  // Sheet 3: Pengingat Tenggat Waktu Vendor
  const pendingExpenses = expenses.filter(
    (e) => e.paymentStatus !== 'Lunas' && e.paymentDeadline
  );

  const deadlineRows = pendingExpenses.map((exp, idx) => {
    const grp = groups.find((g) => g.id === exp.groupId);
    const daysLeft = getDaysDiff(exp.paymentDeadline!);
    const remaining = exp.amount - (exp.paidAmount || 0);

    let statusUrgency = 'Aman';
    if (daysLeft < 0) {
      statusUrgency = `MELEWATI TENGGAT (${Math.abs(daysLeft)} HARI)`;
    } else if (daysLeft <= 7) {
      statusUrgency = `SEGERA DIBAYAR (${daysLeft} HARI LAGI)`;
    }

    return {
      'No': idx + 1,
      'Vendor / Supplier': exp.vendorName,
      'Keterangan Tagihan': exp.title,
      'Grup Keberangkatan': grp ? grp.name : 'Operasional Umum',
      'Kategori': exp.category,
      'Nominal Tagihan (IDR)': exp.amount,
      'Sudah DP (IDR)': exp.paidAmount || 0,
      'Sisa Wajib Lunas (IDR)': remaining,
      'Tenggat Waktu Pembayaran': exp.paymentDeadline,
      'Sisa Hari': daysLeft,
      'Urgency Status': statusUrgency,
      'No. Invoice': exp.invoiceNumber || '-',
    };
  });

  const wsDeadlines = XLSX.utils.json_to_sheet(deadlineRows);
  wsDeadlines['!cols'] = [
    { wch: 5 },
    { wch: 28 },
    { wch: 35 },
    { wch: 30 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 10 },
    { wch: 28 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(wb, wsDeadlines, 'Tenggat Vendor');

  // Write and trigger download
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Laporan_Keuangan_Travel_Umroh_${dateStr}.xlsx`);
};
