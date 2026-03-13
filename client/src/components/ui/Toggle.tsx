import React from 'react';
import styles from './Toggle.module.css';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, disabled }) => {
  return (
    <label className={`${styles.wrapper} ${disabled ? styles.disabled : ''}`}>
      <span className={styles.track} data-checked={checked}>
        <span className={styles.thumb} />
      </span>
      <input
        type="checkbox"
        className={styles.hidden}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      {label && <span className={styles.label}>{label}</span>}
    </label>
  );
};
