import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Clock,
  Image,
} from 'lucide-react';
import { DepartureGroup, ExpenseRecord } from '../types';
import { formatRupiah, formatTanggalIndo } from '../utils/formatters';
import { loadStoredCategories } from '../utils/storage';

interface ExpenseLedgerProps {
  expenses: ExpenseRecord[];
  groups: DepartureGroup[];
  selectedGroupIdFilter?: string;
  onOpenNewExpense: () => void;
  onEditExpense: (expense: ExpenseRecord) => void;
  onDeleteExpense: (expenseId: string) => void;
  onMarkAsPaid: (expenseId: string) => void;
  onViewInvoice: (expense: ExpenseRecord, initialDocType?: 'invoice' | 'transfer') => void;
}

export const ExpenseLedger: React.FC<ExpenseLedgerProps> = ({
  expenses,
  groups,
  selectedGroupIdFilter = 'ALL',
  onOpenNewExpense,
  onEditExpense,
  onDeleteExpense,
  onMarkAsPaid,
  onViewInvoice,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [groupIdFilter, setGroupIdFilter] = useState(selectedGroupIdFilter);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredExpenses = expenses.filter((e) => {
    // Search Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = e.title.toLowerCase().includes(q);
      const matchVendor = e.vendorName.toLowerCase().includes(q);
      const matchInv = (e.invoiceNumber || '').toLowerCase().includes(q);
      if (!matchTitle && !matchVendor && !matchInv) return false;
    }

    // Group Filter
    if (groupIdFilter !== 'ALL') {
      if (groupIdFilter === 'GENERAL' && e.groupId) return false;
      if (groupIdFilter !== 'GENERAL' && e.groupId !== groupIdFilter) return false;
    }

    // Category Filter
    if (categoryFilter !== 'ALL' && e.category !== categoryFilter) return false;

    // Status Filter
    if (statusFilter !== 'ALL' && e.paymentStatus !== statusFilter) return false;

    return true;
  });

  const totalFilteredAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Search & Filter Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-500" /> Ledger &amp; Pencatatan Keuangan Vendor
            </h2>
            <p className="text-xs text-slate-500">
              Kelola riwayat pengeluaran vendor, tagihan, reimbursement staff, dan lampiran foto invoice.
            </p>
          </div>

          <button
            onClick={onOpenNewExpense}
            id="ledger-add-btn"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> + Catat Pengeluaran Baru
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* Search Field */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari item / vendor / invoice..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Group Filter */}
          <select
            value={groupIdFilter}
            onChange={(e) => setGroupIdFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Keberangkatan Grup</option>
            <option value="GENERAL">Operasional Umum (Non-Grup)</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.code})
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Kategori</option>
            {loadStoredCategories().map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Status Bayar</option>
            <option value="Lunas">Lunas</option>
            <option value="DP / Partial">DP / Partial</option>
            <option value="Belum Dibayar">Belum Dibayar</option>
          </select>
        </div>

        {/* Total Summary for Filtered View */}
        <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span className="text-slate-500 font-medium">
            Menampilkan <strong className="text-slate-900">{filteredExpenses.length}</strong> catatan pengeluaran
          </span>
          <span className="font-bold text-slate-900">
            Total Nominal: <strong className="text-emerald-700 font-extrabold">{formatRupiah(totalFilteredAmount)}</strong>
          </span>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-xs font-semibold">
                <th className="py-3 px-4">Tanggal &amp; Vendor</th>
                <th className="py-3 px-4">Keterangan Pengeluaran</th>
                <th className="py-3 px-4">Grup / Kategori</th>
                <th className="py-3 px-4">Nominal (Rp)</th>
                <th className="py-3 px-4">Status &amp; Tenggat</th>
                <th className="py-3 px-3 text-center">Bukti Invoice</th>
                <th className="py-3 px-3 text-center bg-slate-800 text-amber-300 border-x border-slate-800">
                  Bukti Transfer (TF)
                </th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Tidak ada pengeluaran yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const linkedGroup = groups.find((g) => g.id === exp.groupId);

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Date & Vendor */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{exp.vendorName}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {formatTanggalIndo(exp.transactionDate)}
                        </div>
                        {exp.invoiceNumber && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {exp.invoiceNumber}
                          </div>
                        )}
                      </td>

                      {/* Title */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900">{exp.title}</div>
                        {exp.notes && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{exp.notes}</p>
                        )}
                      </td>

                      {/* Group & Category */}
                      <td className="py-3 px-4 space-y-1">
                        <div>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            {exp.category}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {linkedGroup ? linkedGroup.name : 'Operasional Umum'}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 text-sm">
                          {formatRupiah(exp.amount)}
                        </div>
                        {exp.amountSar && (
                          <div className="text-[10px] text-amber-700 font-medium">
                            ~{exp.amountSar.toLocaleString('id-ID')} SAR
                          </div>
                        )}
                      </td>

                      {/* Payment Status & Deadline */}
                      <td className="py-3 px-4 space-y-1">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                            exp.paymentStatus === 'Lunas'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : exp.paymentStatus === 'DP / Partial'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {exp.paymentStatus}
                        </span>

                        {exp.paymentDeadline && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>Tenggat: {exp.paymentDeadline}</span>
                          </div>
                        )}
                      </td>

                      {/* Invoice Thumbnail */}
                      <td className="py-3 px-3 text-center">
                        {exp.invoiceImage ? (
                          <div
                            onClick={() => onViewInvoice(exp, 'invoice')}
                            className="w-11 h-11 mx-auto rounded-lg border border-slate-200 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity bg-slate-100 relative group shadow-sm"
                            title="Klik untuk melihat Bukti Invoice Tagihan"
                          >
                            <img
                              src={exp.invoiceImage}
                              alt="Invoice"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                              <Eye className="w-4 h-4" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-11 h-11 mx-auto rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400">
                            <Image className="w-4 h-4 opacity-40" />
                          </div>
                        )}
                      </td>

                      {/* Transfer Proof (Bukti TF) Thumbnail */}
                      <td className="py-3 px-3 text-center bg-amber-50/20 border-x border-slate-100">
                        {exp.transferProofImage ? (
                          <div
                            onClick={() => onViewInvoice(exp, 'transfer')}
                            className="w-11 h-11 mx-auto rounded-lg border-2 border-emerald-500/80 overflow-hidden cursor-pointer hover:scale-105 transition-all bg-slate-900 relative group shadow-sm"
                            title="Klik untuk melihat Bukti Transfer (TF)"
                          >
                            <img
                              src={exp.transferProofImage}
                              alt="Bukti Transfer"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-emerald-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                              <Eye className="w-4 h-4 text-emerald-400" />
                            </div>
                            <span className="absolute bottom-0 inset-x-0 bg-emerald-600 text-white text-[8px] font-black uppercase tracking-tight py-0.5">
                              TF LUNAS
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => onEditExpense(exp)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300/70 rounded-lg text-[10px] font-bold transition-all inline-flex items-center gap-1 shadow-2xs"
                            title="Upload Bukti Transfer (TF)"
                          >
                            <Plus className="w-3 h-3 text-amber-600" /> + TF
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {exp.paymentStatus !== 'Lunas' && (
                            <button
                              onClick={() => onMarkAsPaid(exp.id)}
                              className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded font-bold text-[10px] transition-colors"
                              title="Tandai Sudah Lunas"
                            >
                              Pelunasan
                            </button>
                          )}
                          <button
                            onClick={() => onEditExpense(exp)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Hapus catatan pengeluaran "${exp.title}"?`)) {
                                onDeleteExpense(exp.id);
                              }
                            }}
                            className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
