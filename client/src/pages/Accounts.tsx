import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAccounts, useCreateAccount, useSyncAccount } from '../services/api/hooks';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { PlaidConnect } from '../components/ui/PlaidConnect';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import styles from './Accounts.module.css';

function formatCurrency(n: number, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(n);
}

const PROVIDER_ICONS: Record<string, string> = {
  BNP: '🏦', SOCIETE_GENERALE: '🔴', CREDIT_AGRICOLE: '🌿', BOURSORAMA: '💙',
  REVOLUT: '⚡', N26: '⬛', MANUAL: '📝', PLAID: '🔗',
};

interface AccountForm {
  provider: string; label: string; type: string; currency: string;
  balance: number; ibanMasked?: string;
}

export default function Accounts() {
  const [showModal, setShowModal] = useState(false);
  const { data, isLoading } = useAccounts();
  const { mutate: create, isPending } = useCreateAccount();
  const { mutate: sync, isPending: syncing } = useSyncAccount();

  const { register, handleSubmit, reset } = useForm<AccountForm>({
    defaultValues: { provider: 'MANUAL', type: 'CHECKING', currency: 'EUR', balance: 0 },
  });

  const onSubmit = (d: AccountForm) => {
    create({ ...d, balance: Number(d.balance) }, {
      onSuccess: () => { setShowModal(false); reset(); },
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Comptes bancaires</h1>
          <p className={styles.subtitle}>
            Total : {data ? formatCurrency(data.total) : '…'}
          </p>
        </div>
        <Button leftIcon="+" onClick={() => setShowModal(true)}>Connecter un compte</Button>
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
                <span className={styles.accountIcon}>{PROVIDER_ICONS[acc.provider] ?? '🏦'}</span>
                <div className={styles.accountMeta}>
                  <div className={styles.accountLabel}>{acc.label}</div>
                  <div className={styles.accountType}>{acc.type} · {acc.provider}</div>
                </div>
              </div>
              {acc.ibanMasked && <div className={styles.iban}>{acc.ibanMasked}</div>}
              <div className={styles.balance}>{formatCurrency(acc.balance, acc.currency)}</div>
              <div className={styles.accountFooter}>
                {acc.lastSyncedAt && (
                  <span className={styles.syncDate}>
                    Sync : {format(new Date(acc.lastSyncedAt), 'd MMM', { locale: fr })}
                  </span>
                )}
                <Button size="sm" variant="outline" onClick={() => sync(acc.id)} loading={syncing}>
                  🔄 Sync
                </Button>
              </div>
            </Card>
          ))}

          {data?.accounts.length === 0 && (
            <div className={styles.empty}>
              <span style={{ fontSize: '3rem' }}>🏦</span>
              <p>Aucun compte connecté.</p>
              <Button onClick={() => setShowModal(true)}>Ajouter un compte</Button>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Connecter un compte">
        {/* Connexion automatique via Plaid (Revolut, BNP, etc.) */}
        <div style={{ marginBlockEnd: '20px', padding: '16px', background: 'rgba(199,36,255,0.08)', borderRadius: '12px', border: '1px solid rgba(199,36,255,0.2)' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text)', marginBlockEnd: '12px' }}>
            ⚡ <strong>Connexion automatique</strong> — Synchronisation en temps réel avec Revolut, BNP, Société Générale et +10 000 banques.
          </p>
          <PlaidConnect onSuccess={() => setShowModal(false)} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBlockEnd: '20px' }}>
          <div style={{ flex: 1, blockSize: '1px', background: 'var(--color-border)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>ou manuellement</span>
          <div style={{ flex: 1, blockSize: '1px', background: 'var(--color-border)' }} />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Banque / Fournisseur</label>
            <select {...register('provider')}>
              <option value="MANUAL">📝 Manuel</option>
              <option value="BNP">🏦 BNP Paribas</option>
              <option value="SOCIETE_GENERALE">🔴 Société Générale</option>
              <option value="CREDIT_AGRICOLE">🌿 Crédit Agricole</option>
              <option value="BOURSORAMA">💙 Boursorama</option>
              <option value="REVOLUT">⚡ Revolut</option>
              <option value="N26">⬛ N26</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Libellé</label>
            <input placeholder="Mon compte courant" {...register('label', { required: true })} />
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
          <div className={styles.formGroup}>
            <label>IBAN masqué (optionnel)</label>
            <input placeholder="FR76 **** **** **** 1234" {...register('ibanMasked')} />
          </div>
          <div className={styles.formActions}>
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit" loading={isPending}>Connecter</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
