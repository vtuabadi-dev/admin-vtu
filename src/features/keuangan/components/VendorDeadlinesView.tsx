import React, { useState } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ShieldAlert,
} from 'lucide-react';
import { DepartureGroup, ExpenseRecord } from '../types';
import { formatRupiah, formatTanggalIndo, getDaysDiff } from '../utils/formatters';

interface VendorDeadlinesViewProps {
  expenses: ExpenseRecord[];
  groups: DepartureGroup[];
  onMarkAsPaid: (expenseId: string) => void;
  onEditExpense: (expense: ExpenseRecord) => void;
}

export const VendorDeadlinesView: React.FC<VendorDeadlinesViewProps> = ({
  expenses,
  groups,
  onMarkAsPaid,
  onEditExpense,
}) => {
  const [filterMode, setFilterMode] = useState<'ALL' | 'OVERDUE' | 'DUE_SOON' | 'PAID'>('ALL');

  // Pending vendor bills that have a payment deadline
  const pendingWithDeadline = expenses.filter((e) => e.paymentDeadline);

  const overdueList = pendingWithDeadline.filter(
    (e) => e.paymentStatus !== 'Lunas' && getDaysDiff(e.paymentDeadline!) < 0
  );

  const dueSoonList = pendingWithDeadline.filter(
    (e) =>
      e.paymentStatus !== 'Lunas' &&
      getDaysDiff(e.paymentDeadline!) >= 0 &&
      getDaysDiff(e.paymentDeadline!) <= 7
  );

  const paidList = pendingWithDeadline.filter((e) => e.paymentStatus === 'Lunas');

  const displayList = pendingWithDeadline
    .filter((e) => {
      if (filterMode === 'OVERDUE') return e.paymentStatus !== 'Lunas' && getDaysDiff(e.paymentDeadline!) < 0;
      if (filterMode === 'DUE_SOON')
        return (
          e.paymentStatus !== 'Lunas' &&
          getDaysDiff(e.paymentDeadline!) >= 0 &&
          getDaysDiff(e.paymentDeadline!) <= 7
        );
      if (filterMode === 'PAID') return e.paymentStatus === 'Lunas';
      return true; // ALL
    })
    .sort((a, b) => getDaysDiff(a.paymentDeadline!) - getDaysDiff(b.paymentDeadline!));

  const totalOverdueAmount = overdueList.reduce((sum, e) => sum + (e.amount - (e.paidAmount || 0)), 0);
  const totalDueSoonAmount = dueSoonList.reduce((sum, e) => sum + (e.amount - (e.paidAmount || 0)), 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" /> Sistem Pengingat Jatuh Tempo Vendor
            </h2>
            <p className="text-xs text-slate-500">
              Notifikasi jadwal tenggat pembayaran tagihan hotel, penerbangan, visa, dan land arrangement vendor.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterMode === 'ALL' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              Semua ({pendingWithDeadline.length})
            </button>
            <button
              onClick={() => setFilterMode('OVERDUE')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterMode === 'OVERDUE'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-700 bg-rose-50'
              }`}
            >
              Terlewat ({overdueList.length})
            </button>
            <button
              onClick={() => setFilterMode('DUE_SOON')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterMode === 'DUE_SOON'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-amber-800 bg-amber-50'
              }`}
            >
              H-7 Due ({dueSoonList.length})
            </button>
            <button
              onClick={() => setFilterMode('PAID')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterMode === 'PAID' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700'
              }`}
            >
              Lunas ({paidList.length})
            </button>
          </div>
        </div>

        {/* Urgency Alert Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Overdue Total */}
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-600 text-white rounded-xl">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                  Total Tagihan Melewati Tenggat
                </span>
                <span className="text-xl font-extrabold text-rose-950">
                  {formatRupiah(totalOverdueAmount)}
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-rose-700 bg-rose-200 px-2.5 py-1 rounded-lg">
              {overdueList.length} Vendor
            </span>
          </div>

          {/* Due Soon Total */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                  Total Tagihan Jatuh Tempo Mingguan
                </span>
                <span className="text-xl font-extrabold text-amber-950">
                  {formatRupiah(totalDueSoonAmount)}
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-200 px-2.5 py-1 rounded-lg">
              {dueSoonList.length} Vendor
            </span>
          </div>
        </div>
      </div>

      {/* Deadlines Timeline / Cards List */}
      <div className="space-y-3">
        {displayList.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <span>Tidak ada tagihan vendor dalam kategori filter ini.</span>
          </div>
        ) : (
          displayList.map((exp) => {
            const grp = groups.find((g) => g.id === exp.groupId);
            const daysLeft = getDaysDiff(exp.paymentDeadline!);
            const remaining = exp.amount - (exp.paidAmount || 0);
            const isPaid = exp.paymentStatus === 'Lunas';

            let cardBorder = 'border-slate-200 bg-white';
            let badgeStyle = 'bg-slate-100 text-slate-700';
            let statusText = `${daysLeft} Hari Lagi`;

            if (isPaid) {
              cardBorder = 'border-emerald-200 bg-emerald-50/30';
              badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-300';
              statusText = 'SUDAH LUNAS';
            } else if (daysLeft < 0) {
              cardBorder = 'border-rose-300 bg-rose-50/40';
              badgeStyle = 'bg-rose-600 text-white';
              statusText = `MELEWATI TENGGAT (${Math.abs(daysLeft)} HARI)`;
            } else if (daysLeft <= 7) {
              cardBorder = 'border-amber-300 bg-amber-50/40';
              badgeStyle = 'bg-amber-500 text-slate-950 font-bold';
              statusText = `JATUH TEMPO ${daysLeft} HARI LAGI`;
            }

            return (
              <div
                key={exp.id}
                className={`p-5 rounded-2xl border shadow-sm transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${cardBorder}`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">{exp.vendorName}</span>
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {grp ? grp.name : 'Operasional Umum'}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {exp.category}
                    </span>
                  </div>

                  <h3 className="text-xs font-semibold text-slate-700">{exp.title}</h3>

                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> Tanggal Tenggat:{' '}
                      <strong className="text-slate-900">
                        {formatTanggalIndo(exp.paymentDeadline!)}
                      </strong>
                    </span>
                    {exp.invoiceNumber && (
                      <span className="text-slate-400 font-mono">Inv: {exp.invoiceNumber}</span>
                    )}
                  </div>
                </div>

                {/* Right Side Amounts & Actions */}
                <div className="flex items-center gap-4 self-end md:self-center shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400">
                      Sisa Wajib Lunas
                    </div>
                    <div className="text-base font-extrabold text-slate-900">
                      {isPaid ? formatRupiah(exp.amount) : formatRupiah(remaining)}
                    </div>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded mt-0.5 ${badgeStyle}`}>
                      {statusText}
                    </span>
                  </div>

                  {!isPaid ? (
                    <button
                      onClick={() => onMarkAsPaid(exp.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/30 transition-all flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Lunasi
                    </button>
                  ) : (
                    <button
                      onClick={() => onEditExpense(exp)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                    >
                      Detail
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
