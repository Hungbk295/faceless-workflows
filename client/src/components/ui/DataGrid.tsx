import type { ReactNode } from 'react';
import styles from './DataGrid.module.css';

export interface DataCell {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  onClick?: () => void;
  tone?: 'default' | 'done' | 'muted';
}

interface DataGridProps {
  cells: DataCell[];
  className?: string;
}

export function DataGrid({ cells, className }: DataGridProps) {
  const wrap = [styles.grid, className ?? ''].filter(Boolean).join(' ');
  return (
    <div className={wrap}>
      {cells.map((c, i) => {
        const cls = [styles.cell, c.onClick ? styles.clickable : ''].filter(Boolean).join(' ');
        const valueColor =
          c.tone === 'done' ? 'var(--olive)' : c.tone === 'muted' ? 'var(--ink-soft)' : undefined;
        return (
          <div key={i} className={cls} onClick={c.onClick}>
            <div className={styles.label}>{c.label}</div>
            <div className={styles.value} style={valueColor ? { color: valueColor } : undefined}>
              {c.value}
            </div>
            {c.sub !== undefined && <div className={styles.sub}>{c.sub}</div>}
          </div>
        );
      })}
    </div>
  );
}
