import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../services/api/client';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Toggle } from '../components/ui/Toggle';
import styles from './Settings.module.css';

export default function Settings() {
  const { user } = useAuthStore();
  const addToast = useUiStore((s) => s.addToast);

  const { mutate: exportData, isPending: exporting } = useMutation({
    mutationFn: () => apiClient.get('/admin/export-data', { responseType: 'blob' }).then((r) => r.data),
    onSuccess: (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'finella-export.json'; a.click();
      URL.revokeObjectURL(url);
      addToast('success', 'Export téléchargé !');
    },
  });

  const { mutate: deleteAccount, isPending: deleting } = useMutation({
    mutationFn: () => apiClient.delete('/admin/account').then((r) => r.data),
    onSuccess: () => {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
    },
    onError: () => addToast('error', 'Erreur lors de la suppression'),
  });

  const confirmDelete = () => {
    if (window.confirm('Supprimer définitivement votre compte ? Cette action est irréversible.')) {
      deleteAccount();
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Paramètres</h1>
      </div>

      {/* Profile */}
      <Card padding="lg">
        <h2 className={styles.sectionTitle}>Profil</h2>
        <div className={styles.profileRow}>
          <div className={styles.avatar}>{user?.fullName?.charAt(0).toUpperCase()}</div>
          <div>
            <div className={styles.profileName}>{user?.fullName}</div>
            <div className={styles.profileEmail}>{user?.email}</div>
            <div className={styles.profileCurrency}>Devise : {user?.currency}</div>
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card padding="lg">
        <h2 className={styles.sectionTitle}>Notifications</h2>
        <div className={styles.toggleList}>
          <div className={styles.toggleItem}>
            <div>
              <div className={styles.toggleLabel}>Alertes budgets</div>
              <div className={styles.toggleDesc}>Notifier quand un budget est proche de la limite</div>
            </div>
            <Toggle checked={true} onChange={() => {}} />
          </div>
          <div className={styles.toggleItem}>
            <div>
              <div className={styles.toggleLabel}>Mises à jour objectifs</div>
              <div className={styles.toggleDesc}>Confirmer les contributions et objectifs atteints</div>
            </div>
            <Toggle checked={true} onChange={() => {}} />
          </div>
          <div className={styles.toggleItem}>
            <div>
              <div className={styles.toggleLabel}>Sync terminée</div>
              <div className={styles.toggleDesc}>Notifier après chaque synchronisation de compte</div>
            </div>
            <Toggle checked={true} onChange={() => {}} />
          </div>
        </div>
      </Card>

      {/* RGPD */}
      <Card padding="lg">
        <h2 className={styles.sectionTitle}>Données & RGPD</h2>
        <p className={styles.rgpdDesc}>
          Conformément au RGPD (Art. 17 & 20), vous pouvez exporter ou supprimer vos données à tout moment.
        </p>
        <div className={styles.rgpdActions}>
          <Button variant="outline" onClick={() => exportData()} loading={exporting} leftIcon="📥">
            Exporter mes données (Art. 20)
          </Button>
          <Button variant="danger" onClick={confirmDelete} loading={deleting} leftIcon="🗑️">
            Supprimer mon compte (Art. 17)
          </Button>
        </div>
      </Card>

      {/* About */}
      <Card padding="lg">
        <h2 className={styles.sectionTitle}>À propos</h2>
        <div className={styles.about}>
          <div className={styles.aboutItem}>
            <span className={styles.aboutKey}>Version</span>
            <span className={styles.aboutVal}>1.0.0</span>
          </div>
          <div className={styles.aboutItem}>
            <span className={styles.aboutKey}>Stack</span>
            <span className={styles.aboutVal}>React · Node.js · PostgreSQL · Prisma</span>
          </div>
          <div className={styles.aboutItem}>
            <span className={styles.aboutKey}>Sécurité</span>
            <span className={styles.aboutVal}>Argon2id · JWT · AES-256-GCM · OWASP</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
