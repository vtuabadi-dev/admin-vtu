import React from 'react';
import {
  Users,
  Wallet,
  Receipt,
  TrendingUp,
  CheckCircle2,
  Clock,
  PlaneTakeoff,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { DepartureGroup, ExpenseRecord, DeadlineNotification } from '../types';
import { formatRupiah, formatShortRupiah, calculateGroupExpenses } from '../utils/formatters';

interface DashboardViewProps {
  groups: DepartureGroup[];
  expenses: ExpenseRecord[];
  notifications: DeadlineNotification[];
  onOpenNewExpense: () => void;
  onOpenNewGroup: () => void;
  onSelectGroup: (groupId: string) => void;
  onViewDeadlines: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  groups,
  expenses,
  notifications,
  onOpenNewExpense,
  onOpenNewGroup,
  onSelectGroup,
  onViewDeadlines,
}) => {
  // Overall Metrics
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = expenses.reduce(
    (sum, e) => sum + (e.paymentStatus === 'Lunas' ? e.amount : e.paidAmount || 0),
    0
  );
  const totalPending = totalExpenses - totalPaid;

  const totalTargetBudget = groups.reduce((sum, g) => sum + g.targetBudget, 0);
  const remainingBudget = totalTargetBudget - totalExpenses;

  const totalSeats = groups.reduce((sum, g) => sum + g.totalQuota, 0);
  const filledSeats = groups.reduce((sum, g) => sum + g.filledQuota, 0);
  const remainingSeats = totalSeats - filledSeats;
  const overallSeatPercent = totalSeats > 0 ? Math.round((filledSeats / totalSeats) * 100) : 0;

  // Chart 1 Data: Expense by Category
  const categoryMap: { [key: string]: number } = {};
  expenses.forEach((e) => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
  });

  const categoryChartData = Object.keys(categoryMap).map((cat) => ({
    name: cat,
    value: categoryMap[cat],
  }));

  const CATEGORY_COLORS = [
    '#059669', // Emerald
    '#0284c7', // Sky Blue
    '#d97706', // Amber
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#10b981', // Mint
    '#f59e0b', // Yellow
    '#6366f1', // Indigo
    '#64748b', // Slate
  ];

  // Chart 2 Data: Group Budget vs Actual Expense
  const groupChartData = groups.map((g) => {
    const groupExp = calculateGroupExpenses(g.id, expenses);
    return {
      name: g.name.length > 20 ? g.name.slice(0, 18) + '...' : g.name,
      fullName: g.name,
      TargetBudget: g.targetBudget,
      ActualExpense: groupExp.totalActual,
      FilledQuota: g.filledQuota,
      TotalQuota: g.totalQuota,
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner & Quick Action */}
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-end pr-8">
          <PlaneTakeoff className="w-64 h-64 text-amber-500" />
        </div>
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-bold text-amber-400">
            <Sparkles className="w-3.5 h-3.5" /> VTU Finance Management
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Dashboard Keuangan Umroh &amp; Sisa Kursi
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Pantau arus kas pembayaran vendor hotel, tiket pesawat, visa &amp; mutawwif per grup keberangkatan. Pastikan kuota kursi terisi penuh dan tenggat waktu pembayaran terpantau aman.
          </p>
          <div className="pt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenNewExpense}
              id="dash-add-expense-btn"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow-md transition-all flex items-center gap-2"
            >
              <Receipt className="w-4 h-4" /> Catat Pembayaran Vendor
            </button>
            <button
              onClick={onOpenNewGroup}
              id="dash-add-group-btn"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
            >
              <Users className="w-4 h-4 text-amber-400" /> + Tambah Grup Baru
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Pengeluaran */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Pengeluaran
            </span>
            <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatRupiah(totalExpenses)}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
              <span className="text-emerald-600 font-bold">
                {formatRupiah(totalPaid)}
              </span>{' '}
              sudah lunas
            </p>
          </div>
        </div>

        {/* Card 2: Sisa Kuota Seat Jamaah */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Sisa Kuota Kursi
            </span>
            <div className="p-2.5 bg-amber-50 rounded-lg text-amber-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight flex items-baseline gap-2">
              <span>{remainingSeats} Kursi Sisa</span>
              <span className="text-xs text-slate-500 font-medium">
                ({filledSeats}/{totalSeats})
              </span>
            </div>
            {/* Small Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${overallSeatPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Tagihan Vendor Pending */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Tagihan Pending
            </span>
            <div className="p-2.5 bg-rose-50 rounded-lg text-rose-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600 tracking-tight">
              {formatRupiah(totalPending)}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
              <span className="font-bold text-slate-700">{notifications.length} item</span>{' '}
              dalam daftar tenggat
            </p>
          </div>
        </div>

        {/* Card 4: Sisa Budget Target */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Sisa Budget Alokasi
            </span>
            <div className="p-2.5 bg-slate-100 rounded-lg text-slate-700">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatRupiah(remainingBudget)}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Dari Total Budget {formatShortRupiah(totalTargetBudget)}
            </p>
          </div>
        </div>
      </div>

      {/* Monitoring Sisa Kuota Kursi Tiap Grup Keberangkatan */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" /> Monitoring Sisa Kuota Kursi Tiap Grup
            </h3>
            <p className="text-xs text-slate-500">
              Pantau langsung jumlah jamaah yang sudah terisi dan sisa kursi kosong di tiap paket keberangkatan.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((grp) => {
            const seatsLeft = grp.totalQuota - grp.filledQuota;
            const percent = Math.round((grp.filledQuota / grp.totalQuota) * 100);
            const groupExp = calculateGroupExpenses(grp.id, expenses);

            // Status Badge Color
            let quotaBadgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
            if (seatsLeft <= 3) {
              quotaBadgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
            } else if (seatsLeft <= 10) {
              quotaBadgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
            }

            return (
              <div
                key={grp.id}
                onClick={() => onSelectGroup(grp.id)}
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer bg-slate-50/50 hover:bg-white group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded uppercase">
                      {grp.code}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors mt-1">
                      {grp.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">{grp.packageType}</p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${quotaBadgeColor}`}
                  >
                    {seatsLeft === 0 ? 'SEAT FULL' : `Sisa ${seatsLeft} Kursi`}
                  </span>
                </div>

                {/* Seat Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Prosentase Terisi: {percent}%</span>
                    <span>
                      {grp.filledQuota} dari {grp.totalQuota} Jamaah
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        percent >= 90
                          ? 'bg-rose-600'
                          : percent >= 70
                          ? 'bg-emerald-600'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Footer Expense Summary for Group */}
                <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Pengeluaran Actual:{' '}
                    <strong className="text-slate-900 font-bold">
                      {formatShortRupiah(groupExp.totalActual)}
                    </strong>
                  </span>
                  <span className="text-emerald-600 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                    Detail Grup <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Breakdown Pengeluaran per Kategori */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Distribusi Pengeluaran per Kategori
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Komposisi biaya terbanyak (Hotel, Tiket, Visa, Transport, Mutawwif).
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryChartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [formatRupiah(Number(val)), 'Nominal']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  layout="horizontal"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Target Budget vs Actual Expense per Group */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Budget vs Actual Pengeluaran per Grup
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Perbandingan alokasi anggaran dan realisasi pembayaran vendor.
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}Jt`} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(val: any) => [formatRupiah(Number(val)), '']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="TargetBudget" name="Target Budget" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ActualExpense" name="Realisasi Actual" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Upcoming Deadlines Quick Widget */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" /> Tagihan Vendor Mendekati Tenggat Waktu
            </h3>
            <p className="text-xs text-slate-500">
              Segera selesaikan pelunasan sebelum batas tanggal jatuh tempo.
            </p>
          </div>
          <button
            onClick={onViewDeadlines}
            id="dash-view-all-deadlines-btn"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
          >
            Lihat Semua Jadwal <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {notifications.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <span>Semua tagihan vendor telah lunas terbayar!</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.slice(0, 5).map((item) => (
              <div
                key={item.expenseId}
                className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-lg transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{item.vendorName}</span>
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium">
                      {item.groupName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{item.title}</p>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="text-xs font-bold text-rose-600">
                      {formatRupiah(item.remainingAmount)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Tenggat: {item.deadline} ({item.daysRemaining < 0
                        ? `Terlewat ${Math.abs(item.daysRemaining)} hr`
                        : `${item.daysRemaining} hr lagi`})
                    </div>
                  </div>
                  <button
                    onClick={onViewDeadlines}
                    className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-md text-[11px] transition-colors"
                  >
                    Bayar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
