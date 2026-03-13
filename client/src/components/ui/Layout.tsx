import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useUiStore } from '../../store/uiStore';
import { ToastContainer } from './Toast';
import styles from './Layout.module.css';

export const Layout: React.FC = () => {
  const { toasts, removeToast, toggleSidebar } = useUiStore();

  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.main}>
        <header className={styles.header}>
          <button className={styles.menuBtn} onClick={toggleSidebar} aria-label="Toggle sidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        </header>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};
