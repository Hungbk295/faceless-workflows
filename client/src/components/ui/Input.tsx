import type { InputHTMLAttributes } from 'react';
import styles from './Field.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export function Input({ label, hint, id, className, ...rest }: InputProps) {
  const inputCls = [styles.input, className ?? ''].filter(Boolean).join(' ');
  if (!label) {
    return (
      <>
        <input id={id} className={inputCls} {...rest} />
        {hint && <div className={styles.hint}>{hint}</div>}
      </>
    );
  }
  return (
    <div className={styles.group}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <input id={id} className={inputCls} {...rest} />
      {hint && <div className={styles.hint}>{hint}</div>}
    </div>
  );
}
