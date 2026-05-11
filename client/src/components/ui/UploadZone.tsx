import { useRef, useState, type DragEvent } from 'react';
import styles from './UploadZone.module.css';

interface UploadZoneProps {
  accept?: string;
  uploaded?: boolean;
  text?: string;
  hint?: string;
  onFile: (file: File) => void;
}

export function UploadZone({
  accept,
  uploaded = false,
  text = 'Drop file here',
  hint = 'or click to browse',
  onFile,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [drag, setDrag] = useState(false);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  const cls = [
    styles.zone,
    drag ? styles.dragover : '',
    uploaded ? styles.uploaded : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cls}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
    >
      <div className={styles.text}>{text}</div>
      <div className={styles.hint}>{hint}</div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
