import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import { useUiStore } from '../../store/uiStore';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Account {
  id: string; label: string; provider: string; type: string;
  balance: number; currency: string; ibanMasked?: string; lastSyncedAt?: string;
}

export interface Category {
  id: string; name: string; emoji: string; color: string; isSystem: boolean;
}

export interface Transaction {
  id: string; date: string; amount: number; label: string; currency: string;
  categoryId?: string; category?: Category; account?: { label: string; provider: string };
  isRecurring: boolean; importSource: string;
}

export interface Budget {
  id: string; categoryId: string; category: Category; limitAmount: number;
  period: string; alertThreshold: number; spent: number; percentage: number;
  status: 'ok' | 'warning' | 'exceeded'; remaining: number;
}

export interface Goal {
  id: string; name: string; type: string; targetAmount: number; currentAmount: number;
  startDate: string; endDate?: string; status: string; icon: string;
  percentage: number; daysRemaining?: number; remaining: number;
}

export interface Notification {
  id: string; type: string; title: string; message: string;
  status: string; createdAt: string; readAt?: string;
}

export interface TransactionStats {
  income: number; expenses: number; balance: number;
  spendingByCategory: Array<{ category: Category | null; total: number }>;
  period: string; dateFrom: string;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.get('/auth/me').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

// ── Accounts ─────────────────────────────────────────────────────────────────

export function useAccounts() {
  return useQuery<{ accounts: Account[]; total: number }>({
    queryKey: ['accounts'],
    queryFn: () => apiClient.get('/accounts').then((r) => r.data),
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.addToast);
  return useMutation({
    mutationFn: (data: Partial<Account>) => apiClient.post('/accounts', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); toast('success', 'Compte ajouté !'); },
    onError: () => toast('error', "Erreur lors de l'ajout du compte"),
  });
}

export function useSyncAccount() {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.addToast);
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/accounts/${id}/sync`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); qc.invalidateQueries({ queryKey: ['transactions'] }); toast('success', 'Sync terminée !'); },
    onError: () => toast('error', 'Erreur de synchronisation'),
  });
}

// ── Transactions ─────────────────────────────────────────────────────────────

export function useTransactions(filters?: Record<string, string>) {
  return useInfiniteQuery({
    queryKey: ['transactions', filters],
    queryFn: ({ pageParam }) =>
      apiClient.get('/transactions', { params: { ...filters, cursor: pageParam ?? undefined, limit: '20' } }).then((r) => r.data),
    getNextPageParam: (last: { nextCursor: string | null }) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });
}

export function useTransactionStats(period?: string) {
  return useQuery<TransactionStats>({
    queryKey: ['transaction-stats', period],
    queryFn: () => apiClient.get('/transactions/stats', { params: { period } }).then((r) => r.data),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.addToast);
  return useMutation({
    mutationFn: ({ id, categoryId }: { id: string; categoryId: string | null }) =>
      apiClient.patch(`/transactions/${id}/category`, { categoryId }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); toast('success', 'Catégorie mise à jour'); },
  });
}

export function useImportCsv() {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.addToast);
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData(); fd.append('file', file);
      return apiClient.post('/transactions/import-csv', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
    },
    onSuccess: (data: { imported: number; skipped: number }) => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      toast('success', `${data.imported} transactions importées (${data.skipped} ignorées)`);
    },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast('error', err.response?.data?.error ?? "Erreur lors de l'import"),
  });
}

// ── Categories ────────────────────────────────────────────────────────────────

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => apiClient.get('/categories').then((r) => r.data),
    staleTime: 10 * 60 * 1000,
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
    mutationFn: (data: Partial<Budget>) => apiClient.post('/budgets', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); toast('success', 'Budget créé !'); },
    onError: () => toast('error', 'Erreur lors de la création'),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.addToast);
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/budgets/${id}`).then((r) => r.data),
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
    mutationFn: (data: Partial<Goal>) => apiClient.post('/goals', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); toast('success', 'Objectif créé !'); },
    onError: () => toast('error', 'Erreur lors de la création'),
  });
}

export function useContributeToGoal() {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.addToast);
  return useMutation({
    mutationFn: ({ id, amount, note }: { id: string; amount: number; note?: string }) =>
      apiClient.post(`/goals/${id}/contribute`, { amount, note }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); toast('success', 'Contribution ajoutée !'); },
    onError: () => toast('error', 'Erreur lors de la contribution'),
  });
}

// ── Notifications ─────────────────────────────────────────────────────────────

export function useNotifications() {
  return useQuery<{ notifications: Notification[]; unreadCount: number }>({
    queryKey: ['notifications'],
    queryFn: () => apiClient.get('/notifications').then((r) => r.data),
    refetchInterval: 30 * 1000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post('/notifications/read-all').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface SpendingForecast {
  categoryId: string | null;
  categoryName: string;
  emoji: string;
  lastMonthActual: number;
  forecastNextMonth: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

export interface BudgetRisk {
  budgetId: string;
  categoryName: string;
  emoji: string;
  limitAmount: number;
  spentSoFar: number;
  forecastedTotal: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  daysRemainingInMonth: number;
  dailyBudgetRemaining: number;
}

export interface Anomaly {
  transactionId: string;
  date: string;
  label: string;
  amount: number;
  categoryName: string;
  zScore: number;
  severity: 'moderate' | 'high' | 'extreme';
  message: string;
}

export interface CashFlowPoint {
  date: string;
  predictedBalance: number;
  confidenceLow: number;
  confidenceHigh: number;
}

export interface Insight {
  type: 'success' | 'warning' | 'info' | 'danger';
  icon: string;
  title: string;
  message: string;
}

export function useSpendingForecasts() {
  return useQuery<SpendingForecast[]>({
    queryKey: ['analytics-forecasts'],
    queryFn: () => apiClient.get('/analytics/forecasts').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useBudgetRisks() {
  return useQuery<BudgetRisk[]>({
    queryKey: ['analytics-risks'],
    queryFn: () => apiClient.get('/analytics/risks').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAnomalies() {
  return useQuery<Anomaly[]>({
    queryKey: ['analytics-anomalies'],
    queryFn: () => apiClient.get('/analytics/anomalies').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCashFlow() {
  return useQuery<CashFlowPoint[]>({
    queryKey: ['analytics-cashflow'],
    queryFn: () => apiClient.get('/analytics/cashflow').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useInsights() {
  return useQuery<Insight[]>({
    queryKey: ['analytics-insights'],
    queryFn: () => apiClient.get('/analytics/insights').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}
