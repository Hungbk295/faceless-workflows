import { useState } from 'react';
import { toast } from '../../store/toast.ts';
import styles from './PromptBlock.module.css';

interface PromptBlockProps {
  label: string;
  prompt: string;
  onRunClaude?: () => void;
  runLabel?: string;
  runDisabled?: boolean;
}

export function PromptBlock({
  label,
  prompt,
  onRunClaude,
  runLabel = 'Run Claude',
  runDisabled = false,
}: PromptBlockProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast('Copied prompt', 'success');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast('Copy failed', 'error');
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span>{label}</span>
        <span className={styles.actions}>
          <button
            type="button"
            className={[styles.iconBtn, copied ? styles.copied : ''].filter(Boolean).join(' ')}
            onClick={onCopy}
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
          {onRunClaude && (
            <button
              type="button"
              className={styles.iconBtn}
              onClick={onRunClaude}
              disabled={runDisabled}
            >
              ▶ {runLabel}
            </button>
          )}
        </span>
      </div>
      <pre className={styles.pre}>{prompt}</pre>
    </div>
  );
}
