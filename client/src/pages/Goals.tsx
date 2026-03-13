import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useGoals, useCreateGoal, useContributeToGoal } from '../services/api/hooks';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { CircleProgress } from '../components/ui/CircleProgress';
import { Skeleton } from '../components/ui/Skeleton';
import styles from './Goals.module.css';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

interface GoalForm {
  name: string; type: string; targetAmount: number; startDate: string; endDate?: string; icon: string;
}

interface ContributeForm { amount: number; note?: string; }

export default function Goals() {
  const [showCreate, setShowCreate] = useState(false);
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);

  const { data: goals, isLoading } = useGoals();
  const { mutate: create, isPending: creating } = useCreateGoal();
  const { mutate: contribute, isPending: contributing } = useContributeToGoal();

  const { register: reg, handleSubmit: hs, reset } = useForm<GoalForm>({
    defaultValues: { type: 'SAVINGS', icon: '🎯' },
  });
  const { register: regC, handleSubmit: hsC, reset: resetC } = useForm<ContributeForm>();

  const onCreateGoal = (d: GoalForm) => {
    create({ ...d, targetAmount: Number(d.targetAmount) }, {
      onSuccess: () => { setShowCreate(false); reset(); },
    });
  };

  const onContribute = (d: ContributeForm) => {
    if (!contributeGoalId) return;
    contribute({ id: contributeGoalId, amount: Number(d.amount), note: d.note }, {
      onSuccess: () => { setContributeGoalId(null); resetC(); },
    });
  };

  const GOAL_TYPE_LABELS: Record<string, string> = {
    SAVINGS: 'Épargne', DEBT_PAYOFF: 'Remboursement', INVESTMENT: 'Investissement',
    EMERGENCY_FUND: "Fond d'urgence", PURCHASE: 'Achat',
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Objectifs</h1>
          <p className={styles.subtitle}>{goals?.filter((g) => g.status === 'ACTIVE').length ?? 0} objectif(s) en cours</p>
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
                <CircleProgress
                  value={goal.percentage}
                  size={100}
                  label={`${goal.percentage.toFixed(0)}%`}
                  sublabel={goal.icon}
                />
                <div className={styles.goalInfo}>
                  <div className={styles.goalIcon}>{goal.icon}</div>
                  <div className={styles.goalName}>{goal.name}</div>
                  <div className={styles.goalType}>{GOAL_TYPE_LABELS[goal.type] ?? goal.type}</div>
                  {goal.daysRemaining !== null && goal.daysRemaining !== undefined && (
                    <div className={styles.goalDays}>
                      {goal.daysRemaining > 0 ? `${goal.daysRemaining}j restants` : 'Échéance dépassée'}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.goalAmounts}>
                <div className={styles.current}>{formatCurrency(goal.currentAmount)}</div>
                <div className={styles.divider}>/</div>
                <div className={styles.target}>{formatCurrency(goal.targetAmount)}</div>
              </div>

              <div className={styles.goalFooter}>
                <span className={styles.remaining}>Encore {formatCurrency(goal.remaining)}</span>
                <Button size="sm" onClick={() => setContributeGoalId(goal.id)}>
                  + Ajouter
                </Button>
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

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nouvel objectif">
        <form onSubmit={hs(onCreateGoal)} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Nom</label>
              <input placeholder="Vacances Grèce" {...reg('name', { required: true })} />
            </div>
            <div className={styles.formGroup} style={{ maxWidth: 80 }}>
              <label>Icône</label>
              <input placeholder="🎯" {...reg('icon')} />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>Type</label>
            <select {...reg('type')}>
              {Object.entries(GOAL_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Montant cible (€)</label>
            <input type="number" step="0.01" min="1" placeholder="2500" {...reg('targetAmount', { required: true })} />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Date de début</label>
              <input type="date" {...reg('startDate', { required: true })} />
            </div>
            <div className={styles.formGroup}>
              <label>Échéance</label>
              <input type="date" {...reg('endDate')} />
            </div>
          </div>
          <div className={styles.formActions}>
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button type="submit" loading={creating}>Créer</Button>
          </div>
        </form>
      </Modal>

      {/* Contribute Modal */}
      <Modal isOpen={!!contributeGoalId} onClose={() => setContributeGoalId(null)} title="Ajouter une contribution" size="sm">
        <form onSubmit={hsC(onContribute)} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Montant (€)</label>
            <input type="number" step="0.01" min="0.01" placeholder="250" {...regC('amount', { required: true, min: 0.01 })} />
          </div>
          <div className={styles.formGroup}>
            <label>Note (optionnel)</label>
            <input placeholder="Économies du mois" {...regC('note')} />
          </div>
          <div className={styles.formActions}>
            <Button type="button" variant="outline" onClick={() => setContributeGoalId(null)}>Annuler</Button>
            <Button type="submit" loading={contributing}>Ajouter</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
