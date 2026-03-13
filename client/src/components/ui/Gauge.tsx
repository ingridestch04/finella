import React from 'react';
import styles from './Gauge.module.css';

interface GaugeProps {
  value: number; // 0-100
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

function getColor(value: number): string {
  if (value >= 100) return 'var(--color-danger)';
  if (value >= 80) return 'var(--color-warning)';
  return 'var(--color-success)';
}

export const Gauge: React.FC<GaugeProps> = ({ value, showLabel = true, size = 'md' }) => {
  const pct = Math.min(Math.max(value, 0), 100);
  const color = getColor(pct);

  return (
    <div className={`${styles.wrapper} ${styles[size]}`}>
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
        />
      </div>
      {showLabel && (
        <span className={styles.label} style={{ color }}>
          {pct.toFixed(0)}%
        </span>
      )}
    </div>
  );
};
