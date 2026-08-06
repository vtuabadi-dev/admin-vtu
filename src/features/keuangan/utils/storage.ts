import { DepartureGroup, ExpenseRecord } from '../types';
import { INITIAL_GROUPS, INITIAL_EXPENSES } from '../data/mockData';

const GROUPS_STORAGE_KEY = 'umrah_finance_groups_v1';
const EXPENSES_STORAGE_KEY = 'umrah_finance_expenses_v1';

export const loadStoredGroups = (): DepartureGroup[] => {
  try {
    const data = localStorage.getItem(GROUPS_STORAGE_KEY);
    if (!data) {
      return [];
    }
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed.filter((g) => g && g.id && !g.id.startsWith('grp-00'));
    }
    return [];
  } catch (err) {
    return [];
  }
};

export const saveStoredGroups = (groups: DepartureGroup[]) => {
  try {
    localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
  } catch (err) {
    console.error('Failed to save groups to localStorage:', err);
  }
};

export const loadStoredExpenses = (): ExpenseRecord[] => {
  try {
    const data = localStorage.getItem(EXPENSES_STORAGE_KEY);
    if (!data) {
      return [];
    }
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed.filter((e) => e && e.id && !e.id.startsWith('exp-00'));
    }
    return [];
  } catch (err) {
    return [];
  }
};

export const saveStoredExpenses = (expenses: ExpenseRecord[]) => {
  try {
    localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
  } catch (err) {
    console.error('Failed to save expenses to localStorage:', err);
  }
};

export const DEFAULT_EXPENSE_CATEGORIES: string[] = [
  'Tiket Penerbangan',
  'Hotel Makkah',
  'Hotel Madinah',
  'Visa & Asuransi',
  'Transport Bus & Train',
  'Mutawwif & Handling',
  'Perlengkapan',
  'Catering & Konsumsi',
  'Operasional & Marketing',
  'Reimbursement',
  'Lain-lain',
];

const CATEGORIES_STORAGE_KEY = 'umrah_finance_custom_categories_v1';

export const loadStoredCategories = (): string[] => {
  try {
    const data = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (!data) return DEFAULT_EXPENSE_CATEGORIES;
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return Array.from(new Set([...DEFAULT_EXPENSE_CATEGORIES, ...parsed]));
    }
    return DEFAULT_EXPENSE_CATEGORIES;
  } catch (err) {
    return DEFAULT_EXPENSE_CATEGORIES;
  }
};

export const saveCustomCategory = (newCat: string): string[] => {
  try {
    const trimmed = newCat.trim();
    if (!trimmed) return loadStoredCategories();
    const current = loadStoredCategories();
    const updated = Array.from(new Set([...current, trimmed]));
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    return DEFAULT_EXPENSE_CATEGORIES;
  }
};

export const resetToInitialData = (): { groups: DepartureGroup[]; expenses: ExpenseRecord[] } => {
  saveStoredGroups(INITIAL_GROUPS);
  saveStoredExpenses(INITIAL_EXPENSES);
  localStorage.removeItem(CATEGORIES_STORAGE_KEY);
  return { groups: INITIAL_GROUPS, expenses: INITIAL_EXPENSES };
};
