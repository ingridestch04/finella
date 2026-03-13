import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTransactions, useCreateTransaction, useDeleteTransaction, useAccounts } from '../services/api/hooks';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import styles from './Transactions.module.css';

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

const CATEGORIES = ['Alimentation', 'Transport', 'Logement', 'Santé', 'Loisirs', 'Éducation', 'Vêtements', 'Voyages', 'Shopping', 'Restaurants', 'Sport', 'Abonnements', 'Salaire', 'Investissements', 'Autre'];

interface TxForm { accountId: string; amount: number; type: 'INCOME' | 'EXPENSE'; category: string; description: string; date: string; }

export default function Transactions() {
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTransactions({ page: String(page), limit: '20' });
  const { data: accountsData } = useAccounts();
  const { mutate: create, isPending } = useCreateTransaction();
  const { mutate: del } = useDeleteTransaction();

  const { register, handleSubmit, reset } = useForm<TxForm>({
    defaultValues: { type: 'EXPENSE', category: 'Alimentation', date: new Date().toISOString().split('T')[0] },
  });

  const onSubmit = (d: TxForm) => {
    create(
      { ...d, amount: Number(d.amount), date: new Date(d.date).toISOString(), accountId: d.accountId || undefined },
      { onSuccess: () => { setShowModal(false); reset(); } }
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Transactions</h1>
          <p className={styles.subtitle}>{data?.total ?? 0} transaction(s)</p>
        </div>
        <Button leftIcon="+" onClick={() => setShowModal(true)}>Nouvelle transaction</Button>
      </div>

      <Card padding="sm">
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Catégorie</th>
                <th>Compte</th>
                <th>Montant</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}><td colSpan={6}><Skeleton variant="text" lines={1} /></td></tr>
                  ))
                : (data?.transactions ?? []).map((tx) => (
                    <tr key={tx.id} className={styles.row}>
                      <td className={styles.date}>{format(new Date(tx.date), 'd MMM yy', { locale: fr })}</td>
                      <td className={styles.label}>{tx.description || '—'}</td>
                      <td><span className={styles.categoryBadge}>{tx.category}</span></td>
                      <td className={styles.account}>{tx.account?.name ?? '—'}</td>
                      <td className={`${styles.amount} ${tx.type === 'INCOME' ? styles.positive : styles.negative}`}>
                        {tx.type === 'INCOME' ? '+' : '-'}{fmt(tx.amount)}
                      </td>
                      <td>
                        <button className={styles.deleteBtn} onClick={() => del(tx.id)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {data && data.totalPages > 1 && (
          <div className={styles.pagination}>
            <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Préc.</Button>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{page} / {data.totalPages}</span>
            <Button variant="ghost" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages}>Suiv. →</Button>
          </div>
        )}
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nouvelle transaction" size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Type</label>
            <select {...register('type')}>
              <option value="EXPENSE">💸 Dépense</option>
              <option value="INCOME">💰 Revenu</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Montant (€)</label>
            <input type="number" step="0.01" min="0.01" placeholder="0.00" {...register('amount', { required: true, min: 0.01 })} />
          </div>
          <div className={styles.formGroup}>
            <label>Catégorie</label>
            <select {...register('category')}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Description (optionnel)</label>
            <input placeholder="Courses Monoprix..." {...register('description')} />
          </div>
          <div className={styles.formGroup}>
            <label>Date</label>
            <input type="date" {...register('date', { required: true })} />
          </div>
          <div className={styles.formGroup}>
            <label>Compte (optionnel)</label>
            <select {...register('accountId')}>
              <option value="">— Aucun —</option>
              {(accountsData?.accounts ?? []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className={styles.formActions}>
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit" loading={isPending}>Ajouter</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
