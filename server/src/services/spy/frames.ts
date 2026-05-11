import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const FFMPEG_BIN = process.env.FFMPEG_BIN || 'ffmpeg';

export class FfmpegError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FfmpegError';
  }
}

export function pickFrameTimestamps(durationSec: number, count: number, minGapRatio = 0.15): number[] {
  if (durationSec <= 0 || count <= 0) return [];
  const lo = Math.floor(durationSec * 0.1);
  const hi = Math.max(lo + 1, Math.floor(durationSec * 0.9));
  const minGap = Math.max(1, Math.floor(durationSec * minGapRatio));
  const out: number[] = [];
  const maxAttempts = count * 20;
  let attempts = 0;
  while (out.length < count && attempts++ < maxAttempts) {
    const t = lo + Math.floor(Math.random() * (hi - lo));
    if (out.every((ex) => Math.abs(ex - t) >= minGap)) out.push(t);
  }
  if (out.length < count) {
    const step = Math.max(1, Math.floor((hi - lo) / Math.max(1, count - 1)));
    out.length = 0;
    for (let i = 0; i < count; i++) out.push(lo + i * step);
  }
  out.sort((a, b) => a - b);
  return out;
}

export async function extractFrame(
  streamUrl: string,
  timestampSec: number,
  outPath: string,
  signal?: AbortSignal,
): Promise<void> {
  await mkdir(dirname(outPath), { recursive: true });
  const proc = Bun.spawn(
    [
      FFMPEG_BIN,
      '-loglevel', 'error',
      '-ss', String(timestampSec),
      '-i', streamUrl,
      '-frames:v', '1',
      '-q:v', '3',
      '-y',
      outPath,
    ],
    { stdout: 'pipe', stderr: 'pipe' },
  );
  const onAbort = () => { try { proc.kill('SIGTERM'); } catch { /* ignore */ } };
  signal?.addEventListener('abort', onAbort);
  try {
    const [stderr, exitCode] = await Promise.all([
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    if (signal?.aborted) throw new FfmpegError('aborted');
    if (exitCode !== 0) {
      throw new FfmpegError(`ffmpeg exited ${exitCode}: ${stderr.slice(0, 200)}`);
    }
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
}

export async function extractFramesForVideo(
  streamUrl: string,
  durationSec: number,
  outPaths: string[],
  signal?: AbortSignal,
): Promise<Array<{ idx: number; timestampSec: number; path: string }>> {
  const timestamps = pickFrameTimestamps(durationSec, outPaths.length);
  const results: Array<{ idx: number; timestampSec: number; path: string }> = [];
  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i];
    const outPath = outPaths[i];
    if (ts === undefined || outPath === undefined) continue;
    await extractFrame(streamUrl, ts, outPath, signal);
    results.push({ idx: i + 1, timestampSec: ts, path: outPath });
  }
  return results;
}
