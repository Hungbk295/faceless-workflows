import type { ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps {
  label?: string;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}

export function Card({ label, title, children, footer }: CardProps) {
  return (
    <div className={styles.card}>
      {label && <div className={styles.label}>{label}</div>}
      {title && <h2 className={styles.title}>{title}</h2>}
      {children && <div className={styles.body}>{children}</div>}
      {footer}
    </div>
  );
}
