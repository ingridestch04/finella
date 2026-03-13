import React from 'react';
import {
  useSpendingForecasts,
  useBudgetRisks,
  useAnomalies,
  useCashFlow,
  useInsights,
  Insight,
  BudgetRisk,
  SpendingForecast,
  Anomaly,
} from '../services/api/hooks';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import styles from './Analytics.module.css';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

const RISK_COLORS: Record<string, string> = {
  low: 'var(--color-success)',
  medium: 'var(--color-warning, #f59e0b)',
  high: 'var(--color-danger)',
  critical: '#dc2626',
};

const INSIGHT_STYLES: Record<Insight['type'], { bg: string; border: string }> = {
  success: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.3)' },
  info:    { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.3)' },
  warning: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)' },
  danger:  { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.3)' },
};

function InsightCard({ insight }: { insight: Insight }) {
  const s = INSIGHT_STYLES[insight.type];
  return (
    <div className={styles.insightCard} style={{ background: s.bg, border: `1px solid ${s.border}` }}>
      <span className={styles.insightIcon}>{insight.icon}</span>
      <div>
        <div className={styles.insightTitle}>{insight.title}</div>
        <div className={styles.insightMsg}>{insight.message}</div>
      </div>
    </div>
  );
}

function RiskBar({ risk }: { risk: BudgetRisk }) {
  const color = RISK_COLORS[risk.riskLevel];
  const pct = Math.min(100, risk.riskScore);
  return (
    <div className={styles.riskItem}>
      <div className={styles.riskHeader}>
        <span>{risk.emoji} {risk.categoryName}</span>
        <span style={{ color, fontWeight: 700 }}>{risk.riskScore}%</span>
      </div>
      <div className={styles.riskBarBg}>
        <div className={styles.riskBarFill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className={styles.riskMeta}>
        <span>Dépensé : {formatCurrency(risk.spentSoFar)} / {formatCurrency(risk.limitAmount)}</span>
        <span>Prévu fin de mois : {formatCurrency(risk.forecastedTotal)}</span>
      </div>
    </div>
  );
}

function ForecastBar({ forecast }: { forecast: SpendingForecast }) {
  const trendColor =
    forecast.trend === 'up' ? 'var(--color-danger)' :
    forecast.trend === 'down' ? 'var(--color-success)' :
    'var(--color-text-muted)';
  return (
    <div className={styles.forecastItem}>
      <span className={styles.forecastEmoji}>{forecast.emoji}</span>
      <div className={styles.forecastInfo}>
        <div className={styles.forecastName}>{forecast.categoryName}</div>
        <div className={styles.forecastValues}>
          <span>Mois passé : {formatCurrency(forecast.lastMonthActual)}</span>
          <span>→</span>
          <span style={{ fontWeight: 700 }}>Prévu : {formatCurrency(forecast.forecastNextMonth)}</span>
          <span style={{ color: trendColor, fontSize: 12 }}>
            {forecast.trend === 'up' ? '▲' : forecast.trend === 'down' ? '▼' : '—'} {Math.abs(forecast.trendPercent)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function AnomalyCard({ anomaly }: { anomaly: Anomaly }) {
  const severityColor =
    anomaly.severity === 'extreme' ? '#dc2626' :
    anomaly.severity === 'high' ? 'var(--color-danger)' :
    'var(--color-warning, #f59e0b)';
  return (
    <div className={styles.anomalyCard} style={{ borderLeft: `3px solid ${severityColor}` }}>
      <div className={styles.anomalyHeader}>
        <span className={styles.anomalyLabel}>{anomaly.label}</span>
        <span style={{ color: severityColor, fontWeight: 700 }}>{formatCurrency(anomaly.amount)}</span>
      </div>
      <div className={styles.anomalyMeta}>
        <span>{anomaly.categoryName}</span>
        <span>{format(new Date(anomaly.date), 'd MMM yyyy', { locale: fr })}</span>
        <span>Z-score : {anomaly.zScore}</span>
      </div>
      <div className={styles.anomalyMsg}>{anomaly.message}</div>
    </div>
  );
}

export default function Analytics() {
  const { data: insights,   isLoading: insightsLoading }   = useInsights();
  const { data: risks,      isLoading: risksLoading }       = useBudgetRisks();
  const { data: forecasts,  isLoading: forecastsLoading }   = useSpendingForecasts();
  const { data: anomalies,  isLoading: anomaliesLoading }   = useAnomalies();
  const { data: cashflow,   isLoading: cashflowLoading }    = useCashFlow();

  const cashflowChart = (cashflow ?? []).map((p) => ({
    date: format(new Date(p.date), 'd MMM', { locale: fr }),
    balance: p.predictedBalance,
    low: p.confidenceLow,
    high: p.confidenceHigh,
  }));

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Analyses Prédictives</h1>
        <p className={styles.subtitle}>Modèle IA • Régression linéaire • Détection d'anomalies Z-score</p>
      </div>

      {/* Insights */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Insights intelligents</h2>
        {insightsLoading ? (
          <Skeleton variant="text" lines={3} />
        ) : (
          <div className={styles.insightsList}>
            {(insights ?? []).map((ins, i) => <InsightCard key={i} insight={ins} />)}
          </div>
        )}
      </section>

      <div className={styles.twoCol}>
        {/* Budget Risks */}
        <Card padding="lg">
          <h2 className={styles.sectionTitle}>Risques budgétaires</h2>
          {risksLoading ? <Skeleton variant="text" lines={4} /> : (
            <div className={styles.riskList}>
              {(risks ?? []).length === 0 ? (
                <p className={styles.empty}>Aucun budget configuré.</p>
              ) : (
                (risks ?? []).map((r) => <RiskBar key={r.budgetId} risk={r} />)
              )}
            </div>
          )}
        </Card>

        {/* Spending Forecasts */}
        <Card padding="lg">
          <h2 className={styles.sectionTitle}>Prévisions dépenses (mois prochain)</h2>
          {forecastsLoading ? <Skeleton variant="text" lines={4} /> : (
            <div className={styles.forecastList}>
              {(forecasts ?? []).length === 0 ? (
                <p className={styles.empty}>Pas assez de données (3 mois requis).</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={forecasts ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="categoryName" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={(v) => v.slice(0, 8)} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={(v) => `${v}€`} />
                      <Tooltip
                        formatter={(v: number) => formatCurrency(v)}
                        contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }}
                      />
                      <Bar dataKey="forecastNextMonth" radius={[4, 4, 0, 0]}>
                        {(forecasts ?? []).map((f, i) => (
                          <Cell key={i} fill={f.trend === 'up' ? 'var(--color-danger)' : f.trend === 'down' ? 'var(--color-success)' : 'var(--color-neon-violet)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  {(forecasts ?? []).map((f) => <ForecastBar key={f.categoryId ?? f.categoryName} forecast={f} />)}
                </>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Cash Flow Chart */}
      <Card padding="lg">
        <h2 className={styles.sectionTitle}>Prévision de trésorerie — 30 prochains jours</h2>
        {cashflowLoading ? <Skeleton variant="chart" height={240} /> : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={cashflowChart} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-neon-violet)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-neon-violet)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-hot-pink)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--color-hot-pink)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} interval={4} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickFormatter={(v) => `${v}€`} />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }}
              />
              <Area type="monotone" dataKey="high"    stroke="transparent" fill="url(#ciGrad)" name="Borne haute" />
              <Area type="monotone" dataKey="low"     stroke="transparent" fill="url(#ciGrad)" name="Borne basse" />
              <Area type="monotone" dataKey="balance" stroke="var(--color-neon-violet)" strokeWidth={2} fill="url(#cfGrad)" name="Solde prévu" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Anomalies */}
      <Card padding="lg">
        <h2 className={styles.sectionTitle}>Transactions inhabituelles détectées</h2>
        {anomaliesLoading ? <Skeleton variant="text" lines={3} /> : (
          <div className={styles.anomalyList}>
            {(anomalies ?? []).length === 0 ? (
              <p className={styles.empty}>Aucune anomalie détectée. Tout semble normal.</p>
            ) : (
              (anomalies ?? []).map((a) => <AnomalyCard key={a.transactionId} anomaly={a} />)
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
