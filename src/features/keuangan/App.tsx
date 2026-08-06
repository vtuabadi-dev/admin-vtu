import React, { useState, useEffect } from 'react';
import { DepartureGroup, ExpenseRecord } from './types';
import {
  loadStoredGroups,
  saveStoredGroups,
  loadStoredExpenses,
  saveStoredExpenses,
  resetToInitialData,
} from './utils/storage';
import { getDeadlineNotifications } from './utils/formatters';
import { exportExpensesToPDF } from './utils/pdfExporter';
import { exportExpensesToExcel } from './utils/excelExporter';

// Components
import { Header } from './components/Header';
import { NotificationBanner } from './components/NotificationBanner';
import { DashboardView } from './components/DashboardView';
import { DepartureGroupList } from './components/DepartureGroupList';
import { ExpenseLedger } from './components/ExpenseLedger';
import { VendorDeadlinesView } from './components/VendorDeadlinesView';
import { ReportsView } from './components/ReportsView';
import { ExpenseModal } from './components/ExpenseModal';
import { InvoiceViewerModal } from './components/InvoiceViewerModal';

export default function App() {
  const [groups, setGroups] = useState<DepartureGroup[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'groups' | 'expenses' | 'deadlines' | 'reports'
  >('dashboard');

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<ExpenseRecord | null>(null);
  const [docToView, setDocToView] = useState<{
    expense: ExpenseRecord;
    docType: 'invoice' | 'transfer';
  } | null>(null);
  const [defaultGroupIdForExpense, setDefaultGroupIdForExpense] = useState<string | undefined>();
  const [selectedGroupIdForLedger, setSelectedGroupIdForLedger] = useState<string>('ALL');

  // Load state on mount (sync with active Paket Umroh Keberangkatan API)
  useEffect(() => {
    async function syncActivePackages() {
      try {
        const res = await fetch('/api/keberangkatan');
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.data) && json.data.length > 0) {
            const mappedGroups: DepartureGroup[] = json.data.map((k: any) => {
              const filled = Array.isArray(k.jamaahIds) ? k.jamaahIds.length : (k.terisi || 0);
              const totalQuota = k.kuota || k.maxSeat || 45;
              const statusStr = (k.status || '').toLowerCase();
              const statusMapped = statusStr === 'selesai' ? 'Selesai' : (statusStr === 'draft' ? 'Direncanakan' : 'Aktif');
              return {
                id: k.id,
                code: k.kode || k.kodeRegistrasi || 'GRP-001',
                name: k.namaPaket || k.namaGroup || `Paket Umroh ${k.kode || ''}`,
                packageType: k.paketUmroh?.namaPaket || k.namaPaket || 'Paket Umroh Regular',
                departureDate: k.tanggalBerangkat ? String(k.tanggalBerangkat).slice(0, 10) : '2026-09-12',
                returnDate: k.tanggalPulang ? String(k.tanggalPulang).slice(0, 10) : '2026-09-21',
                totalQuota: totalQuota,
                filledQuota: filled,
                targetBudget: k.targetMaterialisasi || (k.hargaPaket ? Math.round(k.hargaPaket * totalQuota * 0.7) : 1250000000),
                status: statusMapped,
                notes: k.nomorPenerbangan ? `Flight: ${k.nomorPenerbangan}` : undefined,
              };
            });
            setGroups(mappedGroups);
            saveStoredGroups(mappedGroups);
          } else {
            setGroups(loadStoredGroups());
          }
        } else {
          setGroups(loadStoredGroups());
        }
      } catch (err) {
        setGroups(loadStoredGroups());
      }
      setExpenses(loadStoredExpenses());
    }

    syncActivePackages();
  }, []);

  // Save to storage on state change
  useEffect(() => {
    if (groups.length > 0) saveStoredGroups(groups);
  }, [groups]);

  useEffect(() => {
    if (expenses.length > 0) saveStoredExpenses(expenses);
  }, [expenses]);

  // Derived Notifications
  const notifications = getDeadlineNotifications(expenses, groups);

  // Group Handlers
  const handleAddGroup = (newGroup: DepartureGroup) => {
    const updated = [newGroup, ...groups];
    setGroups(updated);
  };

  const handleUpdateGroup = (updatedGroup: DepartureGroup) => {
    const updated = groups.map((g) => (g.id === updatedGroup.id ? updatedGroup : g));
    setGroups(updated);
  };

  const handleDeleteGroup = (groupId: string) => {
    const updated = groups.filter((g) => g.id !== groupId);
    setGroups(updated);
  };

  // Expense Handlers
  const handleSaveExpense = (savedExpense: ExpenseRecord) => {
    const existingIdx = expenses.findIndex((e) => e.id === savedExpense.id);
    let updated: ExpenseRecord[];
    if (existingIdx >= 0) {
      updated = [...expenses];
      updated[existingIdx] = savedExpense;
    } else {
      updated = [savedExpense, ...expenses];
    }
    setExpenses(updated);
  };

  const handleDeleteExpense = (expenseId: string) => {
    const updated = expenses.filter((e) => e.id !== expenseId);
    setExpenses(updated);
  };

  const handleMarkAsPaid = (expenseId: string) => {
    const updated = expenses.map((e) => {
      if (e.id === expenseId) {
        return {
          ...e,
          paymentStatus: 'Lunas' as const,
          paidAmount: e.amount,
        };
      }
      return e;
    });
    setExpenses(updated);
  };

  const handleResetData = () => {
    if (confirm('Reset seluruh data ke sampel awal travel umroh?')) {
      const reset = resetToInitialData();
      setGroups(reset.groups);
      setExpenses(reset.expenses);
    }
  };

  const handleOpenNewExpense = (defaultGroupId?: string) => {
    setExpenseToEdit(null);
    setDefaultGroupIdForExpense(defaultGroupId);
    setIsExpenseModalOpen(true);
  };

  const handleEditExpense = (expense: ExpenseRecord) => {
    setExpenseToEdit(expense);
    setIsExpenseModalOpen(true);
  };

  const handleSelectGroupFromDashboard = (groupId: string) => {
    setSelectedGroupIdForLedger(groupId);
    setActiveTab('expenses');
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        notifications={notifications}
        onOpenNewExpense={() => handleOpenNewExpense()}
        onOpenNewGroup={() => setIsGroupModalOpen(true)}
        onExportPDF={() => exportExpensesToPDF(expenses, groups)}
        onExportExcel={() => exportExpensesToExcel(expenses, groups)}
        onResetData={handleResetData}
      />

      {/* Urgent Payment Deadline Notification Banner */}
      <NotificationBanner
        notifications={notifications}
        onViewDeadlines={() => setActiveTab('deadlines')}
      />

      {/* Main View Area */}
      <main className="space-y-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            groups={groups}
            expenses={expenses}
            notifications={notifications}
            onOpenNewExpense={() => handleOpenNewExpense()}
            onOpenNewGroup={() => setIsGroupModalOpen(true)}
            onSelectGroup={handleSelectGroupFromDashboard}
            onViewDeadlines={() => setActiveTab('deadlines')}
          />
        )}

        {activeTab === 'groups' && (
          <DepartureGroupList
            groups={groups}
            expenses={expenses}
            onAddGroup={handleAddGroup}
            onUpdateGroup={handleUpdateGroup}
            onDeleteGroup={handleDeleteGroup}
            onSelectGroup={handleSelectGroupFromDashboard}
            onOpenNewExpenseForGroup={(grpId) => handleOpenNewExpense(grpId)}
            isModalOpen={isGroupModalOpen}
            setIsModalOpen={setIsGroupModalOpen}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpenseLedger
            expenses={expenses}
            groups={groups}
            selectedGroupIdFilter={selectedGroupIdForLedger}
            onOpenNewExpense={() => handleOpenNewExpense()}
            onEditExpense={handleEditExpense}
            onDeleteExpense={handleDeleteExpense}
            onMarkAsPaid={handleMarkAsPaid}
            onViewInvoice={(exp, type = 'invoice') => setDocToView({ expense: exp, docType: type })}
          />
        )}

        {activeTab === 'deadlines' && (
          <VendorDeadlinesView
            expenses={expenses}
            groups={groups}
            onMarkAsPaid={handleMarkAsPaid}
            onEditExpense={handleEditExpense}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            expenses={expenses}
            groups={groups}
            onExportPDF={(filtered, title) =>
              exportExpensesToPDF(
                filtered,
                groups,
                'LAPORAN REKAPITULASI PENGELUARAN TRAVEL UMROH',
                title
              )
            }
            onExportExcel={(filtered) => exportExpensesToExcel(filtered, groups)}
          />
        )}
      </main>

      {/* Expense Modal Form */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        groups={groups}
        expenseToEdit={expenseToEdit}
        defaultGroupId={defaultGroupIdForExpense}
        onSaveExpense={handleSaveExpense}
      />

      {/* Invoice & Transfer Proof Lightbox Viewer Modal */}
      <InvoiceViewerModal
        expense={docToView?.expense || null}
        initialDocType={docToView?.docType || 'invoice'}
        onClose={() => setDocToView(null)}
      />

      {/* Simple Footer */}
      <footer className="py-4 text-center text-xs text-slate-500">
        <p>VTU Keuangan Travel Umroh &amp; Hajj © {new Date().getFullYear()} — System Keuangan &amp; Kuota Seat Jamaah</p>
      </footer>
    </div>
  );
}
