import { useEffect, useState } from 'react';
import { Textarea } from './Textarea.tsx';
import { Button } from './Button.tsx';
import styles from './OutputCapture.module.css';

interface OutputCaptureProps {
  label: string;
  value: string;
  onSave: (next: string) => void | Promise<void>;
  placeholder?: string;
  saving?: boolean;
  minHeight?: number;
  /** When non-null, mirrors live-streaming text into the draft (overrides typed input). Set to null after stream ends to release control. */
  streamedText?: string | null;
  /** Visual indicator + disables editing while true. */
  isStreaming?: boolean;
}

export function OutputCapture({
  label,
  value,
  onSave,
  placeholder = 'Paste Claude output here…',
  saving = false,
  minHeight = 240,
  streamedText = null,
  isStreaming = false,
}: OutputCaptureProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  // Mirror streamedText into draft so save uses the streamed content.
  useEffect(() => {
    if (typeof streamedText === 'string') setDraft(streamedText);
  }, [streamedText]);

  const dirty = draft !== value;
  const chars = draft.length;
  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={styles.meta}>
          {chars}c · {words}w {dirty && '· unsaved'} {isStreaming && '· ⏳ streaming…'}
        </span>
      </div>
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        style={{ minHeight }}
        disabled={isStreaming}
      />
      <div className={styles.row}>
        {dirty && (
          <Button variant="ghost" onClick={() => setDraft(value)} disabled={saving || isStreaming}>
            Discard
          </Button>
        )}
        <Button
          variant="rust"
          onClick={() => { void onSave(draft); }}
          disabled={!dirty || saving || isStreaming}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
