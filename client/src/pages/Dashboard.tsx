import React from 'react';
import { useTransactionStats, useAccounts, useNotifications, useTransactions, Transaction } from '../services/api/hooks';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import styles from './Dashboard.module.css';

function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount);
}

const KPI_COLORS = {
  income: 'var(--color-success)',
  expenses: 'var(--color-danger)',
  balance: 'var(--color-neon-violet)',
  total: 'var(--color-hot-pink)',
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useTransactionStats('month');
  const { data: accountsData, isLoading: accountsLoading } = useAccounts();
  const { data: notifData } = useNotifications();
  const { data: txData, isLoading: txLoading } = useTransactions({ limit: '5' });

  const recentTx = (txData?.pages?.[0] as unknown as { transactions: Transaction[] } | undefined)?.transactions ?? [];

  const pieData = (stats?.spendingByCategory ?? []).map((item) => ({
    name: item.category ? `${item.category.emoji} ${item.category.name}` : 'Autre',
    value: item.total,
    color: item.category?.color ?? '#6b7280',
  }));

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Tableau de bord</h1>
        <p className={styles.subtitle}>{format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}</p>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="card" height={120} />)
        ) : (
          <>
            <Card glow="violet" className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Revenus du mois</div>
              <div className={styles.kpiValue} style={{ color: KPI_COLORS.income }}>
                {formatCurrency(stats?.income ?? 0)}
              </div>
              <div className={styles.kpiIcon}>💰</div>
            </Card>
            <Card className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Dépenses du mois</div>
              <div className={styles.kpiValue} style={{ color: KPI_COLORS.expenses }}>
                {formatCurrency(stats?.expenses ?? 0)}
              </div>
              <div className={styles.kpiIcon}>💸</div>
            </Card>
            <Card className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Solde net</div>
              <div className={styles.kpiValue} style={{ color: (stats?.balance ?? 0) >= 0 ? KPI_COLORS.balance : KPI_COLORS.expenses }}>
                {formatCurrency(stats?.balance ?? 0)}
              </div>
              <div className={styles.kpiIcon}>📈</div>
            </Card>
            <Card glow="pink" className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Total comptes</div>
              <div className={styles.kpiValue} style={{ color: KPI_COLORS.total }}>
                {accountsLoading ? '...' : formatCurrency(accountsData?.total ?? 0)}
              </div>
              <div className={styles.kpiIcon}>🏦</div>
            </Card>
          </>
        )}
      </div>

      <div className={styles.chartsRow}>
        {/* Spending Donut */}
        <Card className={styles.donutCard} padding="lg">
          <h2 className={styles.cardTitle}>Dépenses par catégorie</h2>
          {statsLoading ? <Skeleton variant="chart" height={220} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Recent Transactions */}
        <Card className={styles.recentCard} padding="lg">
          <h2 className={styles.cardTitle}>Transactions récentes</h2>
          {txLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} variant="text" lines={1} />)}
            </div>
          ) : (
            <div className={styles.txList}>
              {recentTx.map((tx) => (
                <div key={tx.id} className={styles.txItem}>
                  <div className={styles.txLeft}>
                    <span className={styles.txEmoji}>{tx.category?.emoji ?? '💳'}</span>
                    <div>
                      <div className={styles.txLabel}>{tx.label}</div>
                      <div className={styles.txDate}>{format(new Date(tx.date), 'd MMM', { locale: fr })}</div>
                    </div>
                  </div>
                  <div className={styles.txAmount} style={{ color: tx.amount > 0 ? 'var(--color-success)' : 'var(--color-text)' }}>
                    {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Accounts */}
      <Card padding="lg">
        <h2 className={styles.cardTitle}>Mes comptes</h2>
        {accountsLoading ? <Skeleton variant="card" height={80} /> : (
          <div className={styles.accountsGrid}>
            {accountsData?.accounts.map((acc) => (
              <div key={acc.id} className={styles.accountItem}>
                <div className={styles.accountIcon}>🏦</div>
                <div className={styles.accountInfo}>
                  <div className={styles.accountLabel}>{acc.label}</div>
                  <div className={styles.accountProvider}>{acc.provider}</div>
                </div>
                <div className={styles.accountBalance}>{formatCurrency(acc.balance, acc.currency)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
