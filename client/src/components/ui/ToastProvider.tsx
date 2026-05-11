import { useToastStore } from '../../store/toast.ts';
import styles from './Toast.module.css';

export function ToastProvider() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className={styles.container} aria-live="polite">
      {items.map((t) => {
        const cls = [styles.toast, styles[t.variant] ?? ''].filter(Boolean).join(' ');
        return (
          <div key={t.id} className={cls} onClick={() => dismiss(t.id)} role="status">
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
