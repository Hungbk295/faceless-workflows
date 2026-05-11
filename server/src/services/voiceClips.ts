import { mkdir, unlink, readdir, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { clipPath, clipsDirForChannel } from './filesystem.ts';

export type TTSProvider = 'elevenlabs';

export interface ElevenLabsVoiceParams {
  apiKey: string;
  voiceId: string;
  modelId: string;
  languageCode: string;
  stability: number;
  similarityBoost: number;
  speed: number;
}

export class TTSError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'TTSError';
  }
}

export async function generateElevenLabsAudio(
  v: ElevenLabsVoiceParams,
  text: string,
): Promise<ArrayBuffer> {
  if (!v.apiKey) throw new TTSError(400, 'voice apiKey not configured');
  if (!v.voiceId) throw new TTSError(400, 'voice voiceId not configured');
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(v.voiceId)}?output_format=mp3_44100_128`;
  const body: Record<string, unknown> = {
    text: text.trim(),
    model_id: v.modelId || 'eleven_multilingual_v2',
    voice_settings: {
      stability: v.stability,
      similarity_boost: v.similarityBoost,
      speed: v.speed,
    },
  };
  if (v.languageCode) body.language_code = v.languageCode;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': v.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 400);
    throw new TTSError(res.status, `ElevenLabs HTTP ${res.status}: ${errText}`);
  }
  return await res.arrayBuffer();
}

export async function writeClip(channelId: string, num: number, audio: ArrayBuffer): Promise<{ filePath: string; size: number }> {
  const filePath = clipPath(channelId, num);
  await mkdir(dirname(filePath), { recursive: true });
  await Bun.write(filePath, audio);
  return { filePath, size: audio.byteLength };
}

export async function deleteClipFile(channelId: string, num: number): Promise<boolean> {
  const filePath = clipPath(channelId, num);
  try {
    await unlink(filePath);
    return true;
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e?.code === 'ENOENT') return false;
    throw err;
  }
}

export async function deleteAllClipsForChannel(channelId: string): Promise<number> {
  const dir = clipsDirForChannel(channelId);
  let count = 0;
  try {
    const files = await readdir(dir);
    count = files.filter((f) => f.endsWith('.mp3')).length;
    await rm(dir, { recursive: true, force: true });
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e?.code === 'ENOENT') return 0;
    throw err;
  }
  return count;
}
