import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useGoals, useCreateGoal, useContributeToGoal, useDeleteGoal } from '../services/api/hooks';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { CircleProgress } from '../components/ui/CircleProgress';
import { Skeleton } from '../components/ui/Skeleton';
import styles from './Goals.module.css';

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

const GOAL_TYPES: Record<string, string> = {
  SAVINGS: '🐷 Épargne', DEBT: '💳 Remboursement', PURCHASE: '🛍️ Achat', RETIREMENT: '🌴 Retraite',
};

interface GoalForm { name: string; type: string; targetAmount: number; targetDate?: string; }
interface ContributeForm { amount: number; }

export default function Goals() {
  const [showCreate, setShowCreate] = useState(false);
  const [contributeId, setContributeId] = useState<string | null>(null);
  const { data: goals, isLoading } = useGoals();
  const { mutate: create, isPending: creating } = useCreateGoal();
  const { mutate: contribute, isPending: contributing } = useContributeToGoal();
  const { mutate: del } = useDeleteGoal();
  const { register: reg, handleSubmit: hs, reset } = useForm<GoalForm>({ defaultValues: { type: 'SAVINGS' } });
  const { register: regC, handleSubmit: hsC, reset: resetC } = useForm<ContributeForm>();

  const onCreate = (d: GoalForm) => {
    create({ ...d, targetAmount: Number(d.targetAmount), currentAmount: 0 }, { onSuccess: () => { setShowCreate(false); reset(); } });
  };

  const onContribute = (d: ContributeForm) => {
    if (!contributeId) return;
    contribute({ id: contributeId, amount: Number(d.amount) }, { onSuccess: () => { setContributeId(null); resetC(); } });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Objectifs</h1>
          <p className={styles.subtitle}>{goals?.length ?? 0} objectif(s)</p>
        </div>
        <Button leftIcon="+" onClick={() => setShowCreate(true)}>Nouvel objectif</Button>
      </div>

      {isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} variant="card" height={260} />)}
        </div>
      ) : (
        <div className={styles.grid}>
          {goals?.map((goal) => (
            <Card key={goal.id} className={styles.goalCard}>
              <div className={styles.goalTop}>
                <CircleProgress value={goal.percentage} size={100} label={`${goal.percentage}%`} sublabel="🎯" />
                <div className={styles.goalInfo}>
                  <div className={styles.goalName}>{goal.name}</div>
                  <div className={styles.goalType}>{GOAL_TYPES[goal.type] ?? goal.type}</div>
                  {goal.daysLeft !== null && goal.daysLeft !== undefined && (
                    <div className={styles.goalDays}>
                      {goal.daysLeft > 0 ? `${goal.daysLeft}j restants` : 'Échéance dépassée'}
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.goalAmounts}>
                <div className={styles.current}>{fmt(goal.currentAmount)}</div>
                <div className={styles.divider}>/</div>
                <div className={styles.target}>{fmt(goal.targetAmount)}</div>
              </div>
              <div className={styles.goalFooter}>
                <span className={styles.remaining}>Encore {fmt(goal.remaining)}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button size="sm" onClick={() => setContributeId(goal.id)}>+ Ajouter</Button>
                  <button className={styles.deleteBtn} onClick={() => del(goal.id)}>🗑️</button>
                </div>
              </div>
            </Card>
          ))}
          {goals?.length === 0 && (
            <div className={styles.empty}>
              <span style={{ fontSize: '3rem' }}>🎯</span>
              <p>Aucun objectif créé.</p>
              <Button onClick={() => setShowCreate(true)}>Créer mon premier objectif</Button>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nouvel objectif">
        <form onSubmit={hs(onCreate)} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Nom</label>
            <input placeholder="Vacances Grèce" {...reg('name', { required: true })} />
          </div>
          <div className={styles.formGroup}>
            <label>Type</label>
            <select {...reg('type')}>
              {Object.entries(GOAL_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Montant cible (€)</label>
            <input type="number" step="0.01" min="1" placeholder="2500" {...reg('targetAmount', { required: true })} />
          </div>
          <div className={styles.formGroup}>
            <label>Échéance (optionnel)</label>
            <input type="date" {...reg('targetDate')} />
          </div>
          <div className={styles.formActions}>
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button type="submit" loading={creating}>Créer</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!contributeId} onClose={() => setContributeId(null)} title="Ajouter une contribution" size="sm">
        <form onSubmit={hsC(onContribute)} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Montant (€)</label>
            <input type="number" step="0.01" min="0.01" placeholder="250" {...regC('amount', { required: true, min: 0.01 })} />
          </div>
          <div className={styles.formActions}>
            <Button type="button" variant="outline" onClick={() => setContributeId(null)}>Annuler</Button>
            <Button type="submit" loading={contributing}>Ajouter</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
