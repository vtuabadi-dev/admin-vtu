import { DepartureGroup, ExpenseRecord, DeadlineNotification } from '../types';

export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatShortRupiah = (amount: number): string => {
  if (amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(2)} M`;
  }
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1)} Jt`;
  }
  if (amount >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(0)} rb`;
  }
  return `Rp ${amount}`;
};

export const formatTanggalIndo = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
};

export const getDaysDiff = (targetDateStr: string): number => {
  if (!targetDateStr) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDateStr);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getDeadlineNotifications = (expenses: ExpenseRecord[], groups: DepartureGroup[]): DeadlineNotification[] => {
  const notifications: DeadlineNotification[] = [];

  expenses.forEach((expense) => {
    if (expense.paymentStatus === 'Lunas' || !expense.paymentDeadline) {
      return;
    }

    const daysLeft = getDaysDiff(expense.paymentDeadline);
    const linkedGroup = groups.find((g) => g.id === expense.groupId);
    const remaining = expense.amount - (expense.paidAmount || 0);

    let status: 'OVERDUE' | 'DUE_SOON' | 'UPCOMING' = 'UPCOMING';
    if (daysLeft < 0) {
      status = 'OVERDUE';
    } else if (daysLeft <= 7) {
      status = 'DUE_SOON';
    }

    notifications.push({
      expenseId: expense.id,
      title: expense.title,
      vendorName: expense.vendorName,
      groupName: linkedGroup ? linkedGroup.name : 'Operasional Umum',
      amount: expense.amount,
      remainingAmount: remaining,
      deadline: expense.paymentDeadline,
      daysRemaining: daysLeft,
      status,
    });
  });

  // Sort by urgency: overdue first, then fewest days left
  return notifications.sort((a, b) => a.daysRemaining - b.daysRemaining);
};

export const calculateGroupExpenses = (groupId: string, expenses: ExpenseRecord[]) => {
  const groupExpenses = expenses.filter((e) => e.groupId === groupId);
  const totalActual = groupExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = groupExpenses.reduce((sum, e) => sum + (e.paymentStatus === 'Lunas' ? e.amount : e.paidAmount || 0), 0);
  const totalPending = totalActual - totalPaid;

  return {
    totalActual,
    totalPaid,
    totalPending,
    expenseCount: groupExpenses.length,
  };
};

export const SAR_TO_IDR = 4300; // Estimated exchange rate 1 SAR = ~Rp 4.300
