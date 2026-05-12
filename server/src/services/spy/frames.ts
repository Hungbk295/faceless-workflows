import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const FFMPEG_BIN = process.env.FFMPEG_BIN || 'ffmpeg';

export class FfmpegError extends Error {
  constructor(message: string, public readonly stderr?: string) {
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

// HTTP reconnect flags — survive transient YouTube CDN hiccups during seek.
const FFMPEG_HTTP_FLAGS = [
  '-rw_timeout', '30000000',           // 30s socket timeout
  '-reconnect', '1',
  '-reconnect_streamed', '1',
  '-reconnect_delay_max', '5',
];

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
      ...FFMPEG_HTTP_FLAGS,
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
      throw new FfmpegError(`ffmpeg exited ${exitCode}`, stderr.trim());
    }
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * Extract a single frame with retry. On first failure, calls `refreshStreamUrl`
 * to get a freshly-signed URL and tries once more. Logs full stderr.
 */
export async function extractFrameWithRetry(
  initialStreamUrl: string,
  refreshStreamUrl: () => Promise<string>,
  timestampSec: number,
  outPath: string,
  signal?: AbortSignal,
): Promise<void> {
  try {
    await extractFrame(initialStreamUrl, timestampSec, outPath, signal);
    return;
  } catch (err) {
    if (signal?.aborted) throw err;
    const e = err as FfmpegError;
    console.warn(`[spy/frames] first attempt failed at ts=${timestampSec}s: ${e.message}\n  stderr: ${e.stderr ?? '(none)'}`);
    const freshUrl = await refreshStreamUrl();
    try {
      await extractFrame(freshUrl, timestampSec, outPath, signal);
    } catch (err2) {
      const e2 = err2 as FfmpegError;
      console.error(`[spy/frames] retry failed at ts=${timestampSec}s: ${e2.message}\n  stderr: ${e2.stderr ?? '(none)'}`);
      throw err2;
    }
  }
}

export async function extractFramesForVideo(
  initialStreamUrl: string,
  refreshStreamUrl: () => Promise<string>,
  durationSec: number,
  outPaths: string[],
  signal?: AbortSignal,
): Promise<Array<{ idx: number; timestampSec: number; path: string }>> {
  const timestamps = pickFrameTimestamps(durationSec, outPaths.length);
  const results: Array<{ idx: number; timestampSec: number; path: string }> = [];
  let currentUrl = initialStreamUrl;
  const refreshOnce = async () => {
    currentUrl = await refreshStreamUrl();
    return currentUrl;
  };
  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i];
    const outPath = outPaths[i];
    if (ts === undefined || outPath === undefined) continue;
    await extractFrameWithRetry(currentUrl, refreshOnce, ts, outPath, signal);
    results.push({ idx: i + 1, timestampSec: ts, path: outPath });
  }
  return results;
}
