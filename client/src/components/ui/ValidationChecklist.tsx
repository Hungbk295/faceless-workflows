import styles from './ValidationChecklist.module.css';

export interface ValidationItem {
  label: string;
  ok: boolean;
}

interface Props {
  items: ValidationItem[];
}

export function ValidationChecklist({ items }: Props) {
  return (
    <ul className={styles.list}>
      {items.map((it, i) => {
        const cls = [styles.item, it.ok ? styles.ok : styles.bad].join(' ');
        return (
          <li key={i} className={cls}>
            <span className={styles.mark}>{it.ok ? '✓' : '✗'}</span>
            <span>{it.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
