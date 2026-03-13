import React from 'react';
import styles from './Badge.module.css';

interface BadgeProps {
  label: string;
  color?: string;
  emoji?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ label, color = '#9b3dff', emoji, size = 'sm' }) => {
  return (
    <span
      className={`${styles.badge} ${styles[size]}`}
      style={{
        backgroundColor: `${color}22`,
        color,
        borderColor: `${color}44`,
      }}
    >
      {emoji && <span>{emoji}</span>}
      {label}
    </span>
  );
};
