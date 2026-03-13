import React from 'react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className={styles.wrapper}>
        {label && <label htmlFor={inputId} className={styles.label}>{label}</label>}
        <div className={styles.inputWrapper}>
          {leftIcon && <span className={`${styles.adornment} ${styles.left}`}>{leftIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={`${styles.input} ${error ? styles.error : ''} ${leftIcon ? styles.hasLeft : ''} ${rightIcon ? styles.hasRight : ''} ${className}`}
            {...props}
          />
          {rightIcon && <span className={`${styles.adornment} ${styles.right}`}>{rightIcon}</span>}
        </div>
        {error && <p className={styles.errorMsg} role="alert">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
