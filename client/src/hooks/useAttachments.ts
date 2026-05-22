import { useCallback, useEffect, useState } from 'react';
import { deleteAttachment, uploadAttachment, saveAttachmentsToFolder, openFolderInFinder } from '../api/attachments.ts';


export type AttachmentKind = 'video' | 'frame' | 'file';

export interface AttachmentItem {
  id: string;                  // 'video:VID' | 'frame:VID:idx' | 'file:UUID'
  kind: AttachmentKind;
  label: string;
  previewUrl?: string;
  serverPath: string;
  // video-only
  transcript?: string;
  videoTitle?: string;
  videoId?: string;
  viewCount?: number;
  // file-only
  mimeType?: string;
  size?: number;
}

const STORAGE_PREFIX = 'fs:attachments:';

function load(channelId: string): AttachmentItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + channelId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as AttachmentItem[] : [];
  } catch {
    return [];
  }
}

function save(channelId: string, items: AttachmentItem[]): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + channelId, JSON.stringify(items));
  } catch {
    /* quota */
  }
}

export function useAttachments(channelId: string) {
  const [items, setItems] = useState<AttachmentItem[]>(() => load(channelId));

  useEffect(() => {
    setItems(load(channelId));
  }, [channelId]);

  useEffect(() => {
    save(channelId, items);
  }, [channelId, items]);

  const isAttached = useCallback(
    (id: string) => items.some((it) => it.id === id),
    [items],
  );

  const add = useCallback((item: AttachmentItem) => {
    setItems((prev) => prev.some((it) => it.id === item.id) ? prev : [...prev, item]);
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const toggle = useCallback((item: AttachmentItem) => {
    setItems((prev) =>
      prev.some((it) => it.id === item.id)
        ? prev.filter((it) => it.id !== item.id)
        : [...prev, item],
    );
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    const uploaded = await uploadAttachment(channelId, file);
    const item: AttachmentItem = {
      id: `file:${uploaded.id}`,
      kind: 'file',
      label: uploaded.name,
      previewUrl: uploaded.mimeType.startsWith('image/') ? uploaded.url : undefined,
      serverPath: uploaded.path,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
    };
    setItems((prev) => [...prev, item]);
    return item;
  }, [channelId]);

  const removeFile = useCallback(async (item: AttachmentItem) => {
    if (item.kind === 'file') {
      const fileId = item.id.replace(/^file:/, '');
      await deleteAttachment(channelId, fileId).catch(() => null);
    }
    setItems((prev) => prev.filter((it) => it.id !== item.id));
  }, [channelId]);

  const clear = useCallback(() => setItems([]), []);

  const [lastSavedFolder, setLastSavedFolder] = useState<string | null>(null);

  const saveToFolderNative = useCallback(async () => {
    const targetItems = items.filter((it) => it.serverPath);
    if (targetItems.length === 0) {
      throw new Error('Chưa có ảnh/file nào được đính kèm để lưu');
    }

    const res = await saveAttachmentsToFolder(channelId, '', targetItems);
    if (res.success && res.folder && !(res as any).cancelled) {
      setLastSavedFolder(res.folder);
    }
    return {
      successCount: res.copiedCount,
      failCount: res.errors ? res.errors.length : 0,
      cancelled: (res as any).cancelled || false,
      folder: res.folder,
    };
  }, [channelId, items]);

  const openSavedFolder = useCallback(async () => {
    if (!lastSavedFolder) return;
    try {
      await openFolderInFinder(channelId, lastSavedFolder);
    } catch (err) {
      console.error('Không thể mở thư mục:', err);
    }
  }, [channelId, lastSavedFolder]);

  return { items, isAttached, add, remove, toggle, uploadFile, removeFile, clear, saveToFolderNative, lastSavedFolder, openSavedFolder };
}

