import React from 'react';
import { useTransactionStats, useAccounts, useTransactions } from '../services/api/hooks';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './Dashboard.module.css';

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

const COLORS = ['#c026d3', '#7c3aed', '#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626', '#be123c'];

export default function Dashboard() {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { data: stats, isLoading: statsLoading } = useTransactionStats(startDate, endDate);
  const { data: accountsData, isLoading: accountsLoading } = useAccounts();
  const { data: txData, isLoading: txLoading } = useTransactions({ limit: '5' });

  const pieData = Object.entries(stats?.byCategory ?? {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Tableau de bord</h1>
        <p className={styles.subtitle}>{format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}</p>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        {statsLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="card" height={120} />) : (
          <>
            <Card glow="violet" className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Revenus du mois</div>
              <div className={styles.kpiValue} style={{ color: 'var(--color-success)' }}>{fmt(stats?.income ?? 0)}</div>
              <div className={styles.kpiIcon}>💰</div>
            </Card>
            <Card className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Dépenses du mois</div>
              <div className={styles.kpiValue} style={{ color: 'var(--color-danger)' }}>{fmt(stats?.expenses ?? 0)}</div>
              <div className={styles.kpiIcon}>💸</div>
            </Card>
            <Card className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Solde net</div>
              <div className={styles.kpiValue} style={{ color: (stats?.balance ?? 0) >= 0 ? 'var(--color-neon-violet)' : 'var(--color-danger)' }}>
                {fmt(stats?.balance ?? 0)}
              </div>
              <div className={styles.kpiIcon}>📈</div>
            </Card>
            <Card glow="pink" className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Total comptes</div>
              <div className={styles.kpiValue} style={{ color: 'var(--color-hot-pink)' }}>
                {accountsLoading ? '...' : fmt(accountsData?.totalBalance ?? 0)}
              </div>
              <div className={styles.kpiIcon}>🏦</div>
            </Card>
          </>
        )}
      </div>

      <div className={styles.chartsRow}>
        {/* Spending by Category */}
        <Card className={styles.donutCard} padding="lg">
          <h2 className={styles.cardTitle}>Dépenses par catégorie</h2>
          {statsLoading ? <Skeleton variant="chart" height={220} /> : (
            pieData.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220, color: 'var(--color-text-muted)' }}>
                Aucune dépense ce mois
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )
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
              {(txData?.transactions ?? []).map((tx) => (
                <div key={tx.id} className={styles.txItem}>
                  <div className={styles.txLeft}>
                    <span className={styles.txEmoji}>💳</span>
                    <div>
                      <div className={styles.txLabel}>{tx.description || tx.category}</div>
                      <div className={styles.txDate}>{format(new Date(tx.date), 'd MMM', { locale: fr })}</div>
                    </div>
                  </div>
                  <div className={styles.txAmount} style={{ color: tx.type === 'INCOME' ? 'var(--color-success)' : 'var(--color-text)' }}>
                    {tx.type === 'INCOME' ? '+' : '-'}{fmt(tx.amount)}
                  </div>
                </div>
              ))}
              {(txData?.transactions ?? []).length === 0 && (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px' }}>Aucune transaction</p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Accounts */}
      <Card padding="lg">
        <h2 className={styles.cardTitle}>Mes comptes</h2>
        {accountsLoading ? <Skeleton variant="card" height={80} /> : (
          <div className={styles.accountsGrid}>
            {(accountsData?.accounts ?? []).map((acc) => (
              <div key={acc.id} className={styles.accountItem}>
                <div className={styles.accountIcon}>🏦</div>
                <div className={styles.accountInfo}>
                  <div className={styles.accountLabel}>{acc.name}</div>
                  <div className={styles.accountProvider}>{acc.type}</div>
                </div>
                <div className={styles.accountBalance}>{fmt(acc.balance)}</div>
              </div>
            ))}
            {(accountsData?.accounts ?? []).length === 0 && (
              <p style={{ color: 'var(--color-text-muted)' }}>Aucun compte. Ajoutez-en un dans "Comptes".</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
