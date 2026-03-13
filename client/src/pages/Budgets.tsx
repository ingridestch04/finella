import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useBudgets, useCreateBudget, useDeleteBudget, useCategories } from '../services/api/hooks';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Gauge } from '../components/ui/Gauge';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import styles from './Budgets.module.css';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

interface BudgetForm {
  categoryId: string; limitAmount: number; period: string; alertThreshold: number;
}

export default function Budgets() {
  const [showModal, setShowModal] = useState(false);
  const { data: budgets, isLoading } = useBudgets();
  const { data: categories } = useCategories();
  const { mutate: create, isPending } = useCreateBudget();
  const { mutate: del } = useDeleteBudget();

  const { register, handleSubmit, reset } = useForm<BudgetForm>({
    defaultValues: { period: 'MONTHLY', alertThreshold: 0.8 },
  });

  const onSubmit = (d: BudgetForm) => {
    create({ ...d, limitAmount: Number(d.limitAmount), alertThreshold: Number(d.alertThreshold) }, {
      onSuccess: () => { setShowModal(false); reset(); },
    });
  };

  const STATUS_COLORS = { ok: 'var(--color-success)', warning: 'var(--color-warning)', exceeded: 'var(--color-danger)' };
  const STATUS_LABELS = { ok: 'OK', warning: 'Attention', exceeded: 'Dépassé' };

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
                  <span style={{ fontSize: '1.5rem' }}>{budget.category.emoji}</span>
                  <div>
                    <div className={styles.budgetName}>{budget.category.name}</div>
                    <div className={styles.budgetPeriod}>{budget.period}</div>
                  </div>
                </div>
                <Badge
                  label={STATUS_LABELS[budget.status]}
                  color={STATUS_COLORS[budget.status]}
                />
              </div>

              <div className={styles.budgetAmounts}>
                <span className={styles.spent}>{formatCurrency(budget.spent)}</span>
                <span className={styles.separator}>/</span>
                <span className={styles.limit}>{formatCurrency(budget.limitAmount)}</span>
              </div>

              <Gauge value={budget.percentage} size="lg" />

              <div className={styles.budgetFooter}>
                <span className={styles.remaining}>
                  {budget.status === 'exceeded'
                    ? `Dépassé de ${formatCurrency(budget.spent - budget.limitAmount)}`
                    : `Reste ${formatCurrency(budget.remaining)}`}
                </span>
                <button className={styles.deleteBtn} onClick={() => del(budget.id)} title="Supprimer">🗑️</button>
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
            <select {...register('categoryId', { required: true })}>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Limite (€)</label>
            <input type="number" step="0.01" min="1" placeholder="300" {...register('limitAmount', { required: true, min: 1 })} />
          </div>
          <div className={styles.formGroup}>
            <label>Période</label>
            <select {...register('period')}>
              <option value="WEEKLY">Hebdomadaire</option>
              <option value="MONTHLY">Mensuel</option>
              <option value="QUARTERLY">Trimestriel</option>
              <option value="YEARLY">Annuel</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Seuil d'alerte</label>
            <select {...register('alertThreshold')}>
              <option value="0.7">70%</option>
              <option value="0.8">80%</option>
              <option value="0.9">90%</option>
            </select>
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
