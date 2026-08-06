import React, { useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import { DepartureGroup, ExpenseRecord } from '../types';
import { formatRupiah, formatTanggalIndo } from '../utils/formatters';

interface ReportsViewProps {
  expenses: ExpenseRecord[];
  groups: DepartureGroup[];
  onExportPDF: (filteredExpenses: ExpenseRecord[], selectedGroupName?: string) => void;
  onExportExcel: (filteredExpenses: ExpenseRecord[]) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  expenses,
  groups,
  onExportPDF,
  onExportExcel,
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  const filteredExpenses = expenses.filter((exp) => {
    if (selectedGroupId !== 'ALL' && exp.groupId !== selectedGroupId) return false;
    if (categoryFilter !== 'ALL' && exp.category !== categoryFilter) return false;
    if (statusFilter !== 'ALL' && exp.paymentStatus !== statusFilter) return false;
    return true;
  });

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = filteredExpenses.reduce(
    (sum, e) => sum + (e.paymentStatus === 'Lunas' ? e.amount : e.paidAmount || 0),
    0
  );
  const totalPending = totalAmount - totalPaid;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600" /> Ekspor Laporan Keuangan Umroh (PDF &amp; Excel)
          </h2>
          <p className="text-xs text-slate-500">
            Cetak rekapitulasi pengeluaran vendor per grup keberangkatan atau ekspor spreadsheet data mentah Excel untuk analisa akuntansi lebih lanjut.
          </p>
        </div>

        {/* Filter Selection Controls */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Grup Keberangkatan</label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="ALL">Semua Grup (Konsolidasi Total)</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Kategori Pengeluaran</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="Tiket Penerbangan">Tiket Penerbangan</option>
              <option value="Hotel Makkah">Hotel Makkah</option>
              <option value="Hotel Madinah">Hotel Madinah</option>
              <option value="Visa & Asuransi">Visa &amp; Asuransi</option>
              <option value="Transport Bus & Train">Transport Bus &amp; Train</option>
              <option value="Mutawwif & Handling">Mutawwif &amp; Handling</option>
              <option value="Perlengkapan">Perlengkapan</option>
              <option value="Catering & Konsumsi">Catering &amp; Konsumsi</option>
              <option value="Operasional & Marketing">Operasional &amp; Marketing</option>
              <option value="Reimbursement">Reimbursement</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Status Pembayaran</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="Lunas">Hanya Lunas</option>
              <option value="DP / Partial">DP / Partial</option>
              <option value="Belum Dibayar">Belum Dibayar</option>
            </select>
          </div>
        </div>

        {/* Quick Summary Cards & Download Buttons */}
        <div className="flex flex-col md:flex-row items-stretch justify-between gap-4 pt-2">
          <div className="grid grid-cols-3 gap-3 flex-1 bg-slate-900 text-white p-4 rounded-2xl">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Total Items</span>
              <span className="text-lg font-extrabold">{filteredExpenses.length} Transaksi</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Total Pengeluaran</span>
              <span className="text-lg font-extrabold text-emerald-400">{formatRupiah(totalAmount)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Sisa Tagihan</span>
              <span className="text-lg font-extrabold text-rose-400">{formatRupiah(totalPending)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onExportPDF(filteredExpenses, selectedGroup?.name)}
              id="report-export-pdf-btn"
              className="px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 text-xs"
            >
              <FileText className="w-5 h-5" /> Download PDF Laporan
            </button>

            <button
              onClick={() => onExportExcel(filteredExpenses)}
              id="report-export-excel-btn"
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 text-xs"
            >
              <FileSpreadsheet className="w-5 h-5" /> Download Excel (.xlsx)
            </button>
          </div>
        </div>
      </div>

      {/* Preview Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          Pratinjau Data Laporan ({filteredExpenses.length} Record)
        </h3>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-2.5 px-3">No</th>
                <th className="py-2.5 px-3">Tanggal</th>
                <th className="py-2.5 px-3">Keterangan</th>
                <th className="py-2.5 px-3">Vendor</th>
                <th className="py-2.5 px-3">Grup</th>
                <th className="py-2.5 px-3">Kategori</th>
                <th className="py-2.5 px-3 text-right">Nominal (Rp)</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredExpenses.map((exp, idx) => (
                <tr key={exp.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-2 px-3">{formatTanggalIndo(exp.transactionDate)}</td>
                  <td className="py-2 px-3 font-semibold">{exp.title}</td>
                  <td className="py-2 px-3 text-slate-600">{exp.vendorName}</td>
                  <td className="py-2 px-3 text-slate-500">{exp.groupName}</td>
                  <td className="py-2 px-3">{exp.category}</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900">
                    {formatRupiah(exp.amount)}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        exp.paymentStatus === 'Lunas'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {exp.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
