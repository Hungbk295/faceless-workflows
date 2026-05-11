import type { ReactNode } from 'react';
import { Breadcrumb } from '../ui/Breadcrumb.tsx';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  crumbs: string[];
  title: ReactNode;
  subtitle?: ReactNode;
}

export function PageHeader({ crumbs, title, subtitle }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <Breadcrumb parts={crumbs} />
      <h1 className={styles.title}>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </header>
  );
}
