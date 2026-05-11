import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

export const DATA_DIR = join(homedir(), '.faceless-studio');
export const DB_PATH = join(DATA_DIR, 'faceless.db');
export const CLIPS_DIR = join(DATA_DIR, 'clips');

export function ensureDataDirs(): void {
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(CLIPS_DIR, { recursive: true });
}

export function clipsDirForChannel(channelId: string): string {
  return join(CLIPS_DIR, channelId);
}

export function clipPath(channelId: string, num: number): string {
  const padded = String(num).padStart(3, '0');
  return join(clipsDirForChannel(channelId), `${padded}.mp3`);
}
