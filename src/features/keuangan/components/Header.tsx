import React from 'react';
import {
  LayoutDashboard,
  Users,
  Receipt,
  Clock,
  FileText,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { DeadlineNotification } from '../types';

interface HeaderProps {
  activeTab: 'dashboard' | 'groups' | 'expenses' | 'deadlines' | 'reports';
  setActiveTab: (tab: 'dashboard' | 'groups' | 'expenses' | 'deadlines' | 'reports') => void;
  notifications: DeadlineNotification[];
  onOpenNewExpense: () => void;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  onResetData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  notifications,
  onOpenNewExpense,
  onResetData,
}) => {
  const overdueCount = notifications.filter((n) => n.status === 'OVERDUE').length;
  const dueSoonCount = notifications.filter((n) => n.status === 'DUE_SOON').length;
  const urgentTotal = overdueCount + dueSoonCount;

  return (
    <header className="bg-[#062118] text-white rounded-2xl shadow-xl border border-[#D4AF37]/30 overflow-hidden mb-6">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm italic shadow-md shadow-amber-900/30 shrink-0">
            VTU
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                VTU<span className="text-amber-500 font-semibold">FINANCE</span>
              </h1>
              <span className="bg-slate-800 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-700">
                Umroh &amp; Hajj
              </span>
            </div>
            <p className="text-xs text-slate-400">Pencatatan Arus Kas, Kuota Kursi &amp; Vendor Travel</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
          {/* Reset Demo Data */}
          <button
            onClick={onResetData}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Reset Data Sample Demo"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* New Expense Button */}
          <button
            onClick={onOpenNewExpense}
            id="header-add-expense-btn"
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Catat Pengeluaran</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-2 border-t border-[#D4AF37]/30 text-xs">
          <button
            onClick={() => setActiveTab('dashboard')}
            id="nav-tab-dashboard"
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-[#0E4334] text-[#F5D061] border border-[#D4AF37]/40 shadow-sm'
                : 'text-emerald-100/70 hover:text-white hover:bg-[#0E4334]/50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard &amp; Kuota</span>
          </button>

          <button
            onClick={() => setActiveTab('groups')}
            id="nav-tab-groups"
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'groups'
                ? 'bg-[#0E4334] text-[#F5D061] border border-[#D4AF37]/40 shadow-sm'
                : 'text-emerald-100/70 hover:text-white hover:bg-[#0E4334]/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Grup Keberangkatan</span>
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            id="nav-tab-expenses"
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'expenses'
                ? 'bg-[#0E4334] text-[#F5D061] border border-[#D4AF37]/40 shadow-sm'
                : 'text-emerald-100/70 hover:text-white hover:bg-[#0E4334]/50'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Pencatatan Pengeluaran</span>
          </button>

          <button
            onClick={() => setActiveTab('deadlines')}
            id="nav-tab-deadlines"
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'deadlines'
                ? 'bg-[#0E4334] text-[#F5D061] border border-[#D4AF37]/40 shadow-sm'
                : 'text-emerald-100/70 hover:text-white hover:bg-[#0E4334]/50'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Tenggat Waktu Vendor</span>
            {urgentTotal > 0 && (
              <span className="bg-[#F5D061] text-[#062118] font-black px-1.5 py-0.2 rounded-full text-[10px]">
                {urgentTotal}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            id="nav-tab-reports"
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-[#0E4334] text-[#F5D061] border border-[#D4AF37]/40 shadow-sm'
                : 'text-emerald-100/70 hover:text-white hover:bg-[#0E4334]/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Laporan PDF &amp; Excel</span>
          </button>
        </nav>
      </div>
    </header>
  );
};

