import React from 'react';
import styles from './Skeleton.module.css';

type SkeletonVariant = 'text' | 'card' | 'chart' | 'circle';

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ variant = 'text', width, height, lines = 3 }) => {
  if (variant === 'text') {
    return (
      <div className={styles.textGroup}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={styles.shimmer}
            style={{ width: i === lines - 1 ? '60%' : '100%', height: 16, borderRadius: 4 }}
          />
        ))}
      </div>
    );
  }
  if (variant === 'circle') {
    const sz = width ?? 48;
    return <div className={styles.shimmer} style={{ width: sz, height: sz, borderRadius: '50%' }} />;
  }
  return (
    <div
      className={styles.shimmer}
      style={{
        width: width ?? '100%',
        height: height ?? (variant === 'chart' ? 200 : 120),
        borderRadius: 12,
      }}
    />
  );
};
