import { useCallback, useRef, useState } from 'react';
import type { AttachmentItem } from '../../hooks/useAttachments.ts';
import { toast } from '../../store/toast.ts';
import styles from './AttachmentsPanel.module.css';

interface Props {
  items: AttachmentItem[];
  onRemove: (item: AttachmentItem) => void;
  onUploadFile: (file: File) => Promise<unknown>;
  onSaveToFolderNative?: () => Promise<{ successCount: number; failCount: number }>;
}

const KIND_ICON: Record<AttachmentItem['kind'], string> = {
  video: '🎬',
  frame: '🖼',
  file: '📎',
};

export function AttachmentsPanel({ items, onRemove, onUploadFile, onSaveToFolderNative }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading((n) => n + list.length);
    for (const f of list) {
      try {
        await onUploadFile(f);
      } catch (err) {
        toast(`Upload thất bại: ${f.name} (${err instanceof Error ? err.message : 'error'})`, 'error');
      } finally {
        setUploading((n) => Math.max(0, n - 1));
      }
    }
  }, [onUploadFile]);

  const onPick = () => inputRef.current?.click();
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = '';
  };
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  const handleSaveToFolder = async () => {
    if (!onSaveToFolderNative) return;
    setSaving(true);
    try {
      const res = await onSaveToFolderNative();
      if (res.successCount > 0) {
        toast(`Đã lưu thành công ${res.successCount} file vào thư mục bạn chọn.`, 'success');
      }
      if (res.failCount > 0) {
        toast(`Lưu thất bại ${res.failCount} file.`, 'warning');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // User cancelled the directory picker, do nothing
      }
      toast(`Lưu thất bại: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`${styles.wrap} ${dragOver ? styles.drag : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className={styles.header}>
        <span className={styles.label}>Attachments cho prompt</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={styles.count}>
            {items.length === 0 ? 'chưa có' : `${items.length} mục`}
            {uploading > 0 && ` · đang upload ${uploading}…`}
          </span>
          {items.length > 0 && onSaveToFolderNative && (
            <button
              type="button"
              className={styles.saveActionBtn}
              onClick={handleSaveToFolder}
              disabled={saving}
              title="Mở thư mục trên máy để lưu tất cả ảnh/file"
            >
              {saving ? '⏳ Đang lưu…' : '💾 Lưu vào thư mục khác'}
            </button>
          )}
        </div>
      </div>



      {items.length === 0 ? (
        <div className={styles.empty}>
          Tick checkbox ở Spy panel trên — hoặc kéo / chọn file để thêm vào prompt.
        </div>
      ) : (
        <div className={styles.chipList}>
          {items.map((it) => (
            <div key={it.id} className={styles.chip}>
              {it.previewUrl ? (
                <img className={styles.preview} src={it.previewUrl} alt={it.label} />
              ) : (
                <div className={styles.iconBox}>{KIND_ICON[it.kind]}</div>
              )}
              <div className={styles.info}>
                <span className={styles.kind}>{it.kind}</span>
                <span className={styles.name} title={it.label}>{it.label}</span>
              </div>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => onRemove(it)}
                title="Xoá khỏi prompt"
              >×</button>
            </div>
          ))}
        </div>
      )}

      <div className={styles.dropZone}>
        <button type="button" className={styles.pickBtn} onClick={onPick}>
          + Add files
        </button>
        <span>Kéo thả ảnh / file vào đây, hoặc click để chọn (tối đa 25 MB/file)</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.txt,.md,.pdf,.json"
          onChange={onInputChange}
        />
      </div>
    </div>
  );
}
