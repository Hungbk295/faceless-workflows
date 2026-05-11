import type { TextareaHTMLAttributes } from 'react';
import styles from './Field.module.css';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export function Textarea({ label, hint, id, className, ...rest }: TextareaProps) {
  const cls = [styles.textarea, className ?? ''].filter(Boolean).join(' ');
  if (!label) {
    return (
      <>
        <textarea id={id} className={cls} {...rest} />
        {hint && <div className={styles.hint}>{hint}</div>}
      </>
    );
  }
  return (
    <div className={styles.group}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <textarea id={id} className={cls} {...rest} />
      {hint && <div className={styles.hint}>{hint}</div>}
    </div>
  );
}
