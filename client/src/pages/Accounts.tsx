import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAccounts, useCreateAccount, useDeleteAccount } from '../services/api/hooks';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import styles from './Accounts.module.css';

function fmt(n: number, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(n);
}

interface AccountForm { name: string; type: string; balance: number; currency: string; }

const TYPE_ICONS: Record<string, string> = { CHECKING: '🏦', SAVINGS: '🐷', INVESTMENT: '📈', CREDIT: '💳' };
const TYPE_LABELS: Record<string, string> = { CHECKING: 'Courant', SAVINGS: 'Épargne', INVESTMENT: 'Investissement', CREDIT: 'Crédit' };

export default function Accounts() {
  const [showModal, setShowModal] = useState(false);
  const { data, isLoading } = useAccounts();
  const { mutate: create, isPending } = useCreateAccount();
  const { mutate: del } = useDeleteAccount();
  const { register, handleSubmit, reset } = useForm<AccountForm>({
    defaultValues: { type: 'CHECKING', balance: 0, currency: 'EUR' },
  });

  const onSubmit = (d: AccountForm) => {
    create({ ...d, balance: Number(d.balance) }, { onSuccess: () => { setShowModal(false); reset(); } });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Comptes bancaires</h1>
          <p className={styles.subtitle}>Total : {data ? fmt(data.totalBalance) : '…'}</p>
        </div>
        <Button leftIcon="+" onClick={() => setShowModal(true)}>Ajouter un compte</Button>
      </div>

      {isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="card" height={160} />)}
        </div>
      ) : (
        <div className={styles.grid}>
          {data?.accounts.map((acc) => (
            <Card key={acc.id} className={styles.accountCard}>
              <div className={styles.accountTop}>
                <span className={styles.accountIcon}>{TYPE_ICONS[acc.type] ?? '🏦'}</span>
                <div className={styles.accountMeta}>
                  <div className={styles.accountLabel}>{acc.name}</div>
                  <div className={styles.accountType}>{TYPE_LABELS[acc.type] ?? acc.type} · {acc.currency}</div>
                </div>
              </div>
              <div className={styles.balance}>{fmt(acc.balance, acc.currency)}</div>
              <div className={styles.accountFooter}>
                <button className={styles.deleteBtn} onClick={() => del(acc.id)} title="Supprimer">🗑️</button>
              </div>
            </Card>
          ))}
          {data?.accounts.length === 0 && (
            <div className={styles.empty}>
              <span style={{ fontSize: '3rem' }}>🏦</span>
              <p>Aucun compte. Ajoutez-en un !</p>
              <Button onClick={() => setShowModal(true)}>Ajouter un compte</Button>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Ajouter un compte">
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Nom du compte</label>
            <input placeholder="Mon compte courant" {...register('name', { required: true })} />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Type</label>
              <select {...register('type')}>
                <option value="CHECKING">Courant</option>
                <option value="SAVINGS">Épargne</option>
                <option value="INVESTMENT">Investissement</option>
                <option value="CREDIT">Crédit</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Devise</label>
              <select {...register('currency')}>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>Solde initial (€)</label>
            <input type="number" step="0.01" placeholder="0" {...register('balance')} />
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
