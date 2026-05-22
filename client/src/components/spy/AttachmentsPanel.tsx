import { useCallback, useRef, useState } from 'react';
import type { AttachmentItem } from '../../hooks/useAttachments.ts';
import { toast } from '../../store/toast.ts';
import styles from './AttachmentsPanel.module.css';

interface Props {
  items: AttachmentItem[];
  onRemove: (item: AttachmentItem) => void;
  onUploadFile: (file: File) => Promise<unknown>;
  onSaveToFolder?: (folder: string) => Promise<{ success: boolean; copiedCount: number; folder: string; errors?: string[] }>;
}

const KIND_ICON: Record<AttachmentItem['kind'], string> = {
  video: '🎬',
  frame: '🖼',
  file: '📎',
};

export function AttachmentsPanel({ items, onRemove, onUploadFile, onSaveToFolder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(0);

  const [showSavePanel, setShowSavePanel] = useState(false);
  const [targetFolder, setTargetFolder] = useState(() => {
    return localStorage.getItem('fs:last_target_folder') || '';
  });
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
    const trimmed = targetFolder.trim();
    if (!trimmed) {
      toast('Cần nhập đường dẫn thư mục', 'error');
      return;
    }
    if (!onSaveToFolder) return;

    setSaving(true);
    try {
      const res = await onSaveToFolder(trimmed);
      localStorage.setItem('fs:last_target_folder', trimmed);
      if (res.success) {
        toast(`Đã lưu thành công ${res.copiedCount} file vào: ${res.folder}`, 'success');
        setShowSavePanel(false);
      } else {
        toast('Lưu file gặp một số lỗi', 'warning');
      }
    } catch (err) {
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
          {items.length > 0 && onSaveToFolder && (
            <button
              type="button"
              className={styles.saveActionBtn}
              onClick={() => setShowSavePanel(!showSavePanel)}
              title="Lưu tất cả ảnh/file vào một thư mục khác trên máy tính"
            >
              💾 Lưu vào thư mục khác
            </button>
          )}
        </div>
      </div>

      {showSavePanel && items.length > 0 && (
        <div className={styles.savePanel}>
          <div className={styles.savePanelTitle}>
            <span>Lưu tất cả attachments vào thư mục trên máy tính</span>
          </div>
          <div className={styles.savePanelRow}>
            <input
              type="text"
              className={styles.folderInput}
              placeholder="Ví dụ: /Users/username/Pictures/Exported"
              value={targetFolder}
              onChange={(e) => setTargetFolder(e.target.value)}
              disabled={saving}
            />
            <button
              type="button"
              className={styles.confirmSaveBtn}
              onClick={handleSaveToFolder}
              disabled={saving || !targetFolder.trim()}
            >
              {saving ? 'Đang lưu…' : 'Xác nhận Lưu'}
            </button>
            <button
              type="button"
              className={styles.cancelSaveBtn}
              onClick={() => setShowSavePanel(false)}
              disabled={saving}
            >
              Hủy
            </button>
          </div>
          <span className={styles.savePanelHint}>
            Nhập đường dẫn tuyệt đối hoặc dùng dấu <code>~</code> đại diện cho thư mục Home của bạn.
          </span>
        </div>
      )}


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
