import { DepartureGroup, ExpenseRecord } from '../types';
import { INITIAL_GROUPS, INITIAL_EXPENSES } from '../data/mockData';

const GROUPS_STORAGE_KEY = 'umrah_finance_groups_v1';
const EXPENSES_STORAGE_KEY = 'umrah_finance_expenses_v1';

export const loadStoredGroups = (): DepartureGroup[] => {
  try {
    const data = localStorage.getItem(GROUPS_STORAGE_KEY);
    if (!data) {
      saveStoredGroups(INITIAL_GROUPS);
      return INITIAL_GROUPS;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load groups from localStorage:', err);
    return INITIAL_GROUPS;
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
      saveStoredExpenses(INITIAL_EXPENSES);
      return INITIAL_EXPENSES;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load expenses from localStorage:', err);
    return INITIAL_EXPENSES;
  }
};

export const saveStoredExpenses = (expenses: ExpenseRecord[]) => {
  try {
    localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
  } catch (err) {
    console.error('Failed to save expenses to localStorage:', err);
  }
};

export const resetToInitialData = (): { groups: DepartureGroup[]; expenses: ExpenseRecord[] } => {
  saveStoredGroups(INITIAL_GROUPS);
  saveStoredExpenses(INITIAL_EXPENSES);
  return { groups: INITIAL_GROUPS, expenses: INITIAL_EXPENSES };
};
