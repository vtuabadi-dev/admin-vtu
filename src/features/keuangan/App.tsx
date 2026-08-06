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

  // Load state on mount
  useEffect(() => {
    setGroups(loadStoredGroups());
    setExpenses(loadStoredExpenses());
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
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col">
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
      <footer className="bg-slate-950 border-t border-slate-800 py-4 text-center text-xs text-slate-400">
        <p>VTU Keuangan Travel Umroh &amp; Hajj © {new Date().getFullYear()} — System Keuangan &amp; Kuota Seat Jamaah</p>
      </footer>
    </div>
  );
}
