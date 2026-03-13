import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../services/api/client';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { to: '/',              label: 'Tableau de bord', icon: '📊' },
  { to: '/transactions',  label: 'Transactions',    icon: '💳' },
  { to: '/budgets',       label: 'Budgets',          icon: '📋' },
  { to: '/goals',         label: 'Objectifs',        icon: '🎯' },
  { to: '/accounts',      label: 'Comptes',          icon: '🏦' },
  { to: '/analytics',     label: 'IA Prédictive',    icon: '🤖' },
  { to: '/settings',      label: 'Paramètres',       icon: '⚙️' },
];

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { sidebarOpen } = useUiStore();
  const navigate = useNavigate();

  const { mutate: logout } = useMutation({
    mutationFn: () => apiClient.post('/auth/logout'),
    onSettled: () => { clearAuth(); navigate('/login'); },
  });

  return (
    <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : styles.collapsed}`}>
      <div className={styles.logo}>
        <span className={styles.logoText}>finella</span>
        {sidebarOpen && <span className={styles.logoSub}>Finance Perso</span>}
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {sidebarOpen && <span className={styles.navLabel}>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>
        {sidebarOpen && user && (
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{user.fullName.charAt(0).toUpperCase()}</div>
            <div>
              <div className={styles.userName}>{user.fullName}</div>
              <div className={styles.userCurrency}>{user.currency}</div>
            </div>
          </div>
        )}
        <button className={styles.logoutBtn} onClick={() => logout()} title="Déconnexion">
          <span>🚪</span>
          {sidebarOpen && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
};
