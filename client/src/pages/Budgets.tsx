import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useBudgets, useCreateBudget, useDeleteBudget } from '../services/api/hooks';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Gauge } from '../components/ui/Gauge';
import { Skeleton } from '../components/ui/Skeleton';
import styles from './Budgets.module.css';

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

const CATEGORIES = ['Alimentation', 'Transport', 'Logement', 'Santé', 'Loisirs', 'Éducation', 'Vêtements', 'Voyages', 'Shopping', 'Restaurants', 'Sport', 'Abonnements', 'Autre'];
const STATUS_COLORS = { ok: 'var(--color-success)', warning: 'var(--color-warning)', exceeded: 'var(--color-danger)' };
const STATUS_LABELS = { ok: '✅ OK', warning: '⚠️ Attention', exceeded: '🚨 Dépassé' };

interface BudgetForm { category: string; limit: number; }

export default function Budgets() {
  const [showModal, setShowModal] = useState(false);
  const { data: budgets, isLoading } = useBudgets();
  const { mutate: create, isPending } = useCreateBudget();
  const { mutate: del } = useDeleteBudget();
  const { register, handleSubmit, reset } = useForm<BudgetForm>({ defaultValues: { category: 'Alimentation' } });

  const onSubmit = (d: BudgetForm) => {
    create({ category: d.category, limit: Number(d.limit) }, { onSuccess: () => { setShowModal(false); reset(); } });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Budgets</h1>
          <p className={styles.subtitle}>{budgets?.length ?? 0} budget(s) actif(s) ce mois</p>
        </div>
        <Button leftIcon="+" onClick={() => setShowModal(true)}>Nouveau budget</Button>
      </div>

      {isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="card" height={180} />)}
        </div>
      ) : (
        <div className={styles.grid}>
          {budgets?.map((budget) => (
            <Card key={budget.id} className={styles.budgetCard}>
              <div className={styles.budgetTop}>
                <div className={styles.budgetCategory}>
                  <div className={styles.budgetName}>{budget.category}</div>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: STATUS_COLORS[budget.status] }}>
                  {STATUS_LABELS[budget.status]}
                </span>
              </div>
              <div className={styles.budgetAmounts}>
                <span className={styles.spent}>{fmt(budget.spent)}</span>
                <span className={styles.separator}>/</span>
                <span className={styles.limit}>{fmt(budget.limit)}</span>
              </div>
              <Gauge value={budget.percentage} size="lg" />
              <div className={styles.budgetFooter}>
                <span className={styles.remaining}>
                  {budget.status === 'exceeded'
                    ? `Dépassé de ${fmt(budget.spent - budget.limit)}`
                    : `Reste ${fmt(budget.remaining)}`}
                </span>
                <button className={styles.deleteBtn} onClick={() => del(budget.id)}>🗑️</button>
              </div>
            </Card>
          ))}
          {budgets?.length === 0 && (
            <div className={styles.empty}>
              <span style={{ fontSize: '3rem' }}>📋</span>
              <p>Aucun budget créé.</p>
              <Button onClick={() => setShowModal(true)}>Créer mon premier budget</Button>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nouveau budget" size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Catégorie</label>
            <select {...register('category', { required: true })}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Limite mensuelle (€)</label>
            <input type="number" step="0.01" min="1" placeholder="300" {...register('limit', { required: true, min: 1 })} />
          </div>
          <div className={styles.formActions}>
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit" loading={isPending}>Créer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
