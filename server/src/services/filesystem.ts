import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

export const DATA_DIR = join(homedir(), '.faceless-studio');
export const DB_PATH = join(DATA_DIR, 'faceless.db');
export const CLIPS_DIR = join(DATA_DIR, 'clips');
export const SPY_DIR = join(DATA_DIR, 'spy');
export const ATTACHMENTS_DIR = join(DATA_DIR, 'attachments');

export function ensureDataDirs(): void {
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(CLIPS_DIR, { recursive: true });
  mkdirSync(SPY_DIR, { recursive: true });
  mkdirSync(ATTACHMENTS_DIR, { recursive: true });
}

export function clipsDirForChannel(channelId: string): string {
  return join(CLIPS_DIR, channelId);
}

export function clipPath(channelId: string, num: number): string {
  const padded = String(num).padStart(3, '0');
  return join(clipsDirForChannel(channelId), `${padded}.mp3`);
}

export function spyDirForChannel(channelId: string): string {
  return join(SPY_DIR, channelId);
}

export function spyThumbPath(channelId: string, videoId: string): string {
  return join(spyDirForChannel(channelId), `thumb_${videoId}.jpg`);
}

export function spyFramesDir(channelId: string): string {
  return join(spyDirForChannel(channelId), 'frames');
}

export function spyFramePath(channelId: string, videoId: string, idx: number): string {
  return join(spyFramesDir(channelId), `${videoId}_${idx}.jpg`);
}

export function attachmentsDirForChannel(channelId: string): string {
  return join(ATTACHMENTS_DIR, channelId);
}

export function attachmentPath(channelId: string, fileId: string): string {
  return join(attachmentsDirForChannel(channelId), fileId);
}
