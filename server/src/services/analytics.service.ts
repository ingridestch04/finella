import { prisma } from '../config/database';

// ── Types ────────────────────────────────────────────────────────────────────

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
  riskScore: number;       // 0–100
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

// ── Helpers mathématiques ────────────────────────────────────────────────────

/** Régression linéaire simple : retourne la pente (slope) et l'ordonnée (intercept) */
function linearRegression(points: Array<{ x: number; y: number }>): { slope: number; intercept: number; r2: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0, r2: 0 };

  const sumX  = points.reduce((s, p) => s + p.x, 0);
  const sumY  = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Coefficient de détermination R²
  const meanY = sumY / n;
  const ssTot = points.reduce((s, p) => s + Math.pow(p.y - meanY, 2), 0);
  const ssRes = points.reduce((s, p) => s + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

/** Calcule la moyenne et l'écart-type d'un tableau */
function stats(values: number[]): { mean: number; std: number } {
  if (!values.length) return { mean: 0, std: 0 };
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

/** Retourne la date de début du mois N mois en arrière */
function monthStart(monthsBack: number): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() - monthsBack);
  return d;
}

// ── Service principal ────────────────────────────────────────────────────────

/** Prévision des dépenses par catégorie (régression sur 3 mois) */
export async function forecastSpending(userId: string): Promise<SpendingForecast[]> {
  const categories = await prisma.category.findMany({ where: { userId } });
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  const forecasts: SpendingForecast[] = [];

  for (const cat of categories) {
    // Dépenses par mois sur les 3 derniers mois
    const monthly: number[] = [];
    for (let i = 3; i >= 0; i--) {
      const from = monthStart(i + 1);
      const to = monthStart(i);
      const agg = await prisma.transaction.aggregate({
        where: { userId, categoryId: cat.id, amount: { lt: 0 }, date: { gte: from, lt: to } },
        _sum: { amount: true },
      });
      monthly.push(Math.abs(Number(agg._sum.amount ?? 0)));
    }

    if (monthly.every((m) => m === 0)) continue;

    const points = monthly.slice(0, 3).map((y, x) => ({ x, y }));
    const { slope, intercept } = linearRegression(points);
    const forecast = Math.max(0, slope * 3 + intercept);
    const lastMonth = monthly[2];
    const trendPercent = lastMonth > 0 ? ((forecast - lastMonth) / lastMonth) * 100 : 0;

    forecasts.push({
      categoryId: cat.id,
      categoryName: cat.name,
      emoji: cat.emoji,
      lastMonthActual: lastMonth,
      forecastNextMonth: Math.round(forecast * 100) / 100,
      trend: Math.abs(trendPercent) < 5 ? 'stable' : trendPercent > 0 ? 'up' : 'down',
      trendPercent: Math.round(trendPercent),
    });
  }

  return forecasts.sort((a, b) => b.forecastNextMonth - a.forecastNextMonth).slice(0, 8);
}

/** Évaluation du risque de dépassement de budget */
export async function assessBudgetRisks(userId: string): Promise<BudgetRisk[]> {
  const budgets = await prisma.budget.findMany({
    where: { userId, isActive: true },
    include: { category: true },
  });

  const now = new Date();
  const monthBegin = monthStart(0);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysPassed = now.getDate();
  const daysRemaining = daysInMonth - daysPassed;

  const risks: BudgetRisk[] = [];

  for (const budget of budgets) {
    const agg = await prisma.transaction.aggregate({
      where: { userId, categoryId: budget.categoryId, amount: { lt: 0 }, date: { gte: monthBegin } },
      _sum: { amount: true },
    });

    const spent = Math.abs(Number(agg._sum.amount ?? 0));
    const limit = Number(budget.limitAmount);
    const dailyRate = daysPassed > 0 ? spent / daysPassed : 0;
    const forecastedTotal = dailyRate * daysInMonth;
    const riskScore = Math.min(100, Math.round((forecastedTotal / limit) * 100));
    const dailyBudgetRemaining = daysRemaining > 0 ? (limit - spent) / daysRemaining : 0;

    risks.push({
      budgetId: budget.id,
      categoryName: budget.category.name,
      emoji: budget.category.emoji,
      limitAmount: limit,
      spentSoFar: spent,
      forecastedTotal: Math.round(forecastedTotal * 100) / 100,
      riskScore,
      riskLevel: riskScore >= 100 ? 'critical' : riskScore >= 85 ? 'high' : riskScore >= 60 ? 'medium' : 'low',
      daysRemainingInMonth: daysRemaining,
      dailyBudgetRemaining: Math.max(0, Math.round(dailyBudgetRemaining * 100) / 100),
    });
  }

  return risks.sort((a, b) => b.riskScore - a.riskScore);
}

/** Détection d'anomalies par Z-score par catégorie */
export async function detectAnomalies(userId: string): Promise<Anomaly[]> {
  const recentTxs = await prisma.transaction.findMany({
    where: { userId, amount: { lt: 0 }, date: { gte: monthStart(3) } },
    include: { category: true },
    orderBy: { date: 'desc' },
  });

  // Grouper par catégorie
  const byCategory: Record<string, Array<{ id: string; amount: number; label: string; date: Date; catName: string }>> = {};
  for (const tx of recentTxs) {
    const key = tx.categoryId ?? 'uncategorized';
    if (!byCategory[key]) byCategory[key] = [];
    byCategory[key].push({
      id: tx.id,
      amount: Math.abs(Number(tx.amount)),
      label: tx.label,
      date: tx.date,
      catName: tx.category?.name ?? 'Sans catégorie',
    });
  }

  const anomalies: Anomaly[] = [];

  for (const [, txs] of Object.entries(byCategory)) {
    if (txs.length < 3) continue;
    const amounts = txs.map((t) => t.amount);
    const { mean, std } = stats(amounts);
    if (std === 0) continue;

    // Analyser uniquement les 30 derniers jours pour les anomalies récentes
    const cutoff = new Date(Date.now() - 30 * 86400_000);
    const recent = txs.filter((t) => t.date >= cutoff);

    for (const tx of recent) {
      const zScore = (tx.amount - mean) / std;
      if (zScore > 2) {
        anomalies.push({
          transactionId: tx.id,
          date: tx.date.toISOString().split('T')[0],
          label: tx.label,
          amount: tx.amount,
          categoryName: tx.catName,
          zScore: Math.round(zScore * 10) / 10,
          severity: zScore > 4 ? 'extreme' : zScore > 3 ? 'high' : 'moderate',
          message: `Cette transaction est ${Math.round(zScore)}× supérieure à la moyenne habituelle (${Math.round(mean)}€) dans cette catégorie.`,
        });
      }
    }
  }

  return anomalies.sort((a, b) => b.zScore - a.zScore).slice(0, 5);
}

/** Prévision du cash flow sur 30 jours */
export async function forecastCashFlow(userId: string): Promise<CashFlowPoint[]> {
  // Récupérer le solde total actuel
  const accounts = await prisma.bankAccount.findMany({ where: { userId, isActive: true } });
  const currentBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);

  // Transactions des 90 derniers jours pour estimer les flux quotidiens
  const txs = await prisma.transaction.findMany({
    where: { userId, date: { gte: monthStart(3) } },
    select: { date: true, amount: true },
    orderBy: { date: 'asc' },
  });

  // Regrouper par jour
  const dailyMap: Record<string, number> = {};
  for (const tx of txs) {
    const day = tx.date.toISOString().split('T')[0];
    dailyMap[day] = (dailyMap[day] ?? 0) + Number(tx.amount);
  }
  const dailyValues = Object.values(dailyMap);

  const { mean: dailyMean, std: dailyStd } = stats(dailyValues);

  // Générer les 30 prochains jours
  const points: CashFlowPoint[] = [];
  let balance = currentBalance;

  for (let i = 1; i <= 30; i++) {
    const d = new Date(Date.now() + i * 86400_000);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const dayFactor = isWeekend ? 0.7 : 1.1; // moins de dépenses le week-end
    const predicted = dailyMean * dayFactor;
    balance += predicted;

    const margin = dailyStd * Math.sqrt(i) * 0.5; // incertitude croissante
    points.push({
      date: d.toISOString().split('T')[0],
      predictedBalance: Math.round(balance * 100) / 100,
      confidenceLow: Math.round((balance - margin) * 100) / 100,
      confidenceHigh: Math.round((balance + margin) * 100) / 100,
    });
  }

  return points;
}

/** Génère des insights textuels basés sur les données */
export async function generateInsights(userId: string): Promise<Insight[]> {
  const [risks, anomalies, forecasts] = await Promise.all([
    assessBudgetRisks(userId),
    detectAnomalies(userId),
    forecastSpending(userId),
  ]);

  const insights: Insight[] = [];
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysPassed = now.getDate();
  const monthProgress = daysPassed / daysInMonth;

  // Budgets critiques
  const critical = risks.filter((r) => r.riskLevel === 'critical');
  const high = risks.filter((r) => r.riskLevel === 'high');

  if (critical.length > 0) {
    insights.push({
      type: 'danger',
      icon: '🚨',
      title: 'Budget(s) dépassé(s)',
      message: `${critical.map((r) => r.categoryName).join(', ')} — Réduction immédiate recommandée.`,
    });
  }

  if (high.length > 0 && monthProgress < 0.8) {
    insights.push({
      type: 'warning',
      icon: '⚠️',
      title: 'Risque de dépassement',
      message: `${high.map((r) => `${r.categoryName} (${r.riskScore}% du budget)`).join(', ')} à surveiller.`,
    });
  }

  // Anomalies
  const extreme = anomalies.filter((a) => a.severity === 'extreme');
  if (extreme.length > 0) {
    insights.push({
      type: 'warning',
      icon: '🔍',
      title: 'Transaction inhabituelle détectée',
      message: `"${extreme[0].label}" (${extreme[0].amount}€) est ${extreme[0].zScore}× supérieur à la normale.`,
    });
  }

  // Tendances positives
  const down = forecasts.filter((f) => f.trend === 'down' && f.trendPercent < -10);
  if (down.length > 0) {
    insights.push({
      type: 'success',
      icon: '📉',
      title: 'Économies en progression',
      message: `Vos dépenses en ${down[0].categoryName} diminuent de ${Math.abs(down[0].trendPercent)}% ce mois.`,
    });
  }

  // Prévision optimiste
  const totalForecast = forecasts.reduce((s, f) => s + f.forecastNextMonth, 0);
  const totalLast = forecasts.reduce((s, f) => s + f.lastMonthActual, 0);
  if (totalForecast < totalLast && totalLast > 0) {
    const saving = Math.round(totalLast - totalForecast);
    insights.push({
      type: 'info',
      icon: '💡',
      title: 'Prévision favorable',
      message: `Vous pourriez économiser ~${saving}€ de plus ce mois par rapport au mois dernier.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: 'success',
      icon: '✅',
      title: 'Situation financière saine',
      message: 'Aucune anomalie détectée. Continuez sur cette lancée !',
    });
  }

  return insights;
}
