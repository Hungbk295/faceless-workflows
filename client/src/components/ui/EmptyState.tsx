import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  icon?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon = '∅', title, children, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <div className={styles.icon}>{icon}</div>
      <h3 className={styles.title}>{title}</h3>
      {children && <div className={styles.body}>{children}</div>}
      {action}
    </div>
  );
}
