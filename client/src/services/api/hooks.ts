import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import { useUiStore } from '../../store/uiStore';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description?: string;
  accountId?: string;
  account?: { name: string };
}

export interface TransactionStats {
  income: number;
  expenses: number;
  balance: number;
  byCategory: Record<string, number>;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  spent: number;
  percentage: number;
  status: 'ok' | 'warning' | 'exceeded';
  remaining: number;
}

export interface Goal {
  id: string;
  name: string;
  type: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  percentage: number;
  remaining: number;
  daysLeft?: number | null;
}

// ── Accounts ─────────────────────────────────────────────────────────────────

export function useAccounts() {
  return useQuery<{ accounts: Account[]; totalBalance: number }>({
    queryKey: ['accounts'],
    queryFn: () => apiClient.get('/accounts').then((r) => r.data),
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.addToast);
  return useMutation({
    mutationFn: (data: Omit<Account, 'id'>) => apiClient.post('/accounts', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); toast('success', 'Compte ajouté !'); },
    onError: (e: { response?: { data?: { error?: string } } }) => toast('error', e.response?.data?.error ?? 'Erreur'),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.addToast);
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/accounts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); toast('success', 'Compte supprimé'); },
  });
}

// ── Transactions ─────────────────────────────────────────────────────────────

export function useTransactions(params?: Record<string, string>) {
  return useQuery<{ transactions: Transaction[]; total: number; page: number; totalPages: number }>({
    queryKey: ['transactions', params],
    queryFn: () => apiClient.get('/transactions', { params }).then((r) => r.data),
  });
}

export function useTransactionStats(startDate?: string, endDate?: string) {
  return useQuery<TransactionStats>({
    queryKey: ['transaction-stats', startDate, endDate],
    queryFn: () => apiClient.get('/transactions/stats', { params: { startDate, endDate } }).then((r) => r.data),
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.addToast);
  return useMutation({
    mutationFn: (data: Omit<Transaction, 'id'>) => apiClient.post('/transactions', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['transaction-stats'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      toast('success', 'Transaction ajoutée !');
    },
    onError: (e: { response?: { data?: { error?: string } } }) => toast('error', e.response?.data?.error ?? 'Erreur'),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.addToast);
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/transactions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['transaction-stats'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      toast('success', 'Transaction supprimée');
    },
  });
}

// ── Budgets ───────────────────────────────────────────────────────────────────

export function useBudgets() {
  return useQuery<Budget[]>({
    queryKey: ['budgets'],
    queryFn: () => apiClient.get('/budgets').then((r) => r.data),
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.addToast);
  return useMutation({
    mutationFn: (data: { category: string; limit: number }) => apiClient.post('/budgets', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); toast('success', 'Budget créé !'); },
    onError: (e: { response?: { data?: { error?: string } } }) => toast('error', e.response?.data?.error ?? 'Erreur'),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.addToast);
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/budgets/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); toast('success', 'Budget supprimé'); },
  });
}

// ── Goals ─────────────────────────────────────────────────────────────────────

export function useGoals() {
  return useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: () => apiClient.get('/goals').then((r) => r.data),
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.addToast);
  return useMutation({
    mutationFn: (data: Omit<Goal, 'id' | 'percentage' | 'remaining' | 'daysLeft'>) =>
      apiClient.post('/goals', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); toast('success', 'Objectif créé !'); },
    onError: (e: { response?: { data?: { error?: string } } }) => toast('error', e.response?.data?.error ?? 'Erreur'),
  });
}

export function useContributeToGoal() {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.addToast);
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      apiClient.post(`/goals/${id}/contribute`, { amount }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); toast('success', 'Contribution ajoutée !'); },
    onError: (e: { response?: { data?: { error?: string } } }) => toast('error', e.response?.data?.error ?? 'Erreur'),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.addToast);
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/goals/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); toast('success', 'Objectif supprimé'); },
  });
}
