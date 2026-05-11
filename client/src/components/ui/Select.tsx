import type { SelectHTMLAttributes, ReactNode } from 'react';
import styles from './Field.module.css';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  children: ReactNode;
}

export function Select({ label, hint, id, className, children, ...rest }: SelectProps) {
  const cls = [styles.select, className ?? ''].filter(Boolean).join(' ');
  if (!label) {
    return (
      <>
        <select id={id} className={cls} {...rest}>{children}</select>
        {hint && <div className={styles.hint}>{hint}</div>}
      </>
    );
  }
  return (
    <div className={styles.group}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <select id={id} className={cls} {...rest}>{children}</select>
      {hint && <div className={styles.hint}>{hint}</div>}
    </div>
  );
}
