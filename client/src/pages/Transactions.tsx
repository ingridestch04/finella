import React, { useState, useRef } from 'react';
import { useTransactions, useCategories, useUpdateCategory, useImportCsv, useAccounts, Transaction } from '../services/api/hooks';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import styles from './Transactions.module.css';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

export default function Transactions() {
  const [showImport, setShowImport] = useState(false);
  const [editTxId, setEditTxId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useTransactions();
  const { data: categories } = useCategories();
  const { data: accountsData } = useAccounts();
  const { mutate: updateCat } = useUpdateCategory();
  const { mutate: importCsv, isPending: importing } = useImportCsv();
  const hasAccounts = (accountsData?.accounts?.length ?? 0) > 0;

  const allTransactions = data?.pages.flatMap((p) => (p as unknown as { transactions: Transaction[] }).transactions) ?? [];

  const handleImport = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    importCsv(file, { onSuccess: () => setShowImport(false) });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Transactions</h1>
          <p className={styles.subtitle}>{allTransactions.length} transaction(s)</p>
        </div>
        <Button variant="outline" leftIcon="📂" onClick={() => setShowImport(true)}>Import CSV</Button>
      </div>

      <Card padding="sm">
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Libellé</th>
                <th>Catégorie</th>
                <th>Compte</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5}><Skeleton variant="text" lines={1} /></td>
                    </tr>
                  ))
                : allTransactions.map((tx) => (
                    <tr key={tx.id} className={styles.row}>
                      <td className={styles.date}>
                        {format(new Date(tx.date), 'd MMM yy', { locale: fr })}
                      </td>
                      <td className={styles.label}>
                        <span>{tx.label}</span>
                        {tx.isRecurring && <span className={styles.recurringBadge}>🔄</span>}
                      </td>
                      <td>
                        {tx.category ? (
                          <Badge label={tx.category.name} color={tx.category.color} emoji={tx.category.emoji} />
                        ) : (
                          <button className={styles.categorizeBtn} onClick={() => setEditTxId(tx.id)}>
                            Catégoriser
                          </button>
                        )}
                      </td>
                      <td className={styles.account}>{tx.account?.label}</td>
                      <td className={`${styles.amount} ${tx.amount > 0 ? styles.positive : styles.negative}`}>
                        {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {hasNextPage && (
          <div className={styles.loadMore}>
            <Button variant="ghost" onClick={() => fetchNextPage()} loading={isFetchingNextPage}>
              Charger plus
            </Button>
          </div>
        )}
      </Card>

      {/* Categorize Modal */}
      <Modal isOpen={!!editTxId} onClose={() => setEditTxId(null)} title="Choisir une catégorie" size="sm">
        <div className={styles.catGrid}>
          {categories?.map((c) => (
            <button
              key={c.id}
              className={styles.catItem}
              onClick={() => { updateCat({ id: editTxId!, categoryId: c.id }); setEditTxId(null); }}
            >
              <span style={{ fontSize: '1.5rem' }}>{c.emoji}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={showImport} onClose={() => setShowImport(false)} title="Importer CSV / Excel" size="sm">
        <div className={styles.importArea}>
          {!hasAccounts && (
            <div style={{ background: 'rgba(255,45,120,0.1)', border: '1px solid rgba(255,45,120,0.4)', borderRadius: '8px', padding: '12px', marginBlockEnd: '16px', color: 'var(--color-text)', fontSize: '0.875rem' }}>
              ⚠️ Vous devez d'abord créer un <strong>compte bancaire</strong> (onglet "Comptes") avant d'importer.
            </div>
          )}
          <div className={styles.importIcon}>📂</div>
          <p className={styles.importDesc}>
            Formats supportés : <code>.csv</code> et <code>.xlsx</code> (Excel)<br />
            Colonnes requises : <code>date</code>, <code>label</code> (ou libellé), <code>amount</code> (ou montant)
          </p>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className={styles.fileInput} disabled={!hasAccounts} />
          <Button onClick={handleImport} loading={importing} fullWidth size="lg" disabled={!hasAccounts}>
            Importer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
