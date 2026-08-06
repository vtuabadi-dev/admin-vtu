import React from 'react';
import { AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';
import { DeadlineNotification } from '../types';
import { formatRupiah } from '../utils/formatters';

interface NotificationBannerProps {
  notifications: DeadlineNotification[];
  onViewDeadlines: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  notifications,
  onViewDeadlines,
}) => {
  const urgentItems = notifications.filter(
    (n) => n.status === 'OVERDUE' || n.status === 'DUE_SOON'
  );

  if (urgentItems.length === 0 || !urgentItems[0]) return null;

  const firstItem = urgentItems[0];
  const overdue = urgentItems.filter((n) => n.status === 'OVERDUE');
  const dueSoon = urgentItems.filter((n) => n.status === 'DUE_SOON');

  return (
    <div className="bg-amber-950/90 border-b border-amber-600/40 text-amber-100 py-3 px-4 sm:px-6 lg:px-8 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 shrink-0 border border-amber-500/40">
            {overdue.length > 0 ? (
              <ShieldAlert className="w-5 h-5 text-rose-400 animate-bounce" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
            )}
          </div>
          <div>
            <div className="font-bold text-amber-200 text-sm flex items-center gap-2">
              <span>Peringatan Tenggat Waktu Pembayaran Vendor!</span>
              {overdue.length > 0 && (
                <span className="bg-rose-900 text-rose-200 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-600">
                  {overdue.length} MELEWATI TENGGAT
                </span>
              )}
              {dueSoon.length > 0 && (
                <span className="bg-amber-900 text-amber-200 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-600">
                  {dueSoon.length} JATUH TEMPO MINGGU INI
                </span>
              )}
            </div>
            <p className="text-amber-300/90 mt-0.5">
              Tagihan terdekat:{' '}
              <span className="font-semibold text-white">{firstItem.vendorName}</span> (
              {firstItem.title}) — Wajib Lunas{' '}
              <span className="font-bold underline text-amber-200">
                {formatRupiah(firstItem.remainingAmount)}
              </span>{' '}
              ({firstItem.daysRemaining < 0
                ? `Terlewat ${Math.abs(firstItem.daysRemaining)} hari`
                : `${firstItem.daysRemaining} hari lagi`})
            </p>
          </div>
        </div>

        <button
          onClick={onViewDeadlines}
          id="banner-view-deadlines-btn"
          className="shrink-0 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5 text-xs"
        >
          <span>Proses Pelunasan Vendor</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
