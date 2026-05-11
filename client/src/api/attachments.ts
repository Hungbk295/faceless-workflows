import type { UploadedAttachmentDto } from 'shared';
import { ApiError } from './client.ts';

const base = (channelId: string) =>
  `/api/channels/${encodeURIComponent(channelId)}/attachments`;

export async function uploadAttachment(channelId: string, file: File): Promise<UploadedAttachmentDto> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(base(channelId), { method: 'POST', body: fd });
  const text = await res.text();
  const parsed: unknown = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = parsed && typeof parsed === 'object' && 'message' in parsed
      ? String((parsed as { message?: unknown }).message)
      : `HTTP ${res.status}`;
    throw new ApiError(res.status, msg, parsed);
  }
  return parsed as UploadedAttachmentDto;
}

export async function deleteAttachment(channelId: string, fileId: string): Promise<void> {
  const res = await fetch(`${base(channelId)}/${encodeURIComponent(fileId)}`, { method: 'DELETE' });
  if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`, null);
}
