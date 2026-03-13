import React from 'react';
import styles from './Card.module.css';

interface CardProps {
  children: React.ReactNode;
  glow?: 'pink' | 'violet' | 'none';
  className?: string;
  onClick?: () => void;
  padding?: 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({ children, glow = 'none', className = '', onClick, padding = 'md' }) => {
  return (
    <div
      className={`${styles.card} ${styles[`glow-${glow}`]} ${styles[`pad-${padding}`]} ${onClick ? styles.clickable : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
