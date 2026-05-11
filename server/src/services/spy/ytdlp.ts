const YT_DLP_BIN = process.env.YT_DLP_BIN || 'yt-dlp';

export interface VideoCandidateId {
  videoId: string;
}

export interface VideoInfo {
  videoId: string;
  title: string;
  viewCount: number;
  durationSec: number;
  uploadDate: string | null;
  thumbnailUrl: string | null;
  streamUrl: string | null;
}

export class YtDlpError extends Error {
  constructor(message: string, public readonly stderr?: string) {
    super(message);
    this.name = 'YtDlpError';
  }
}

async function run(args: string[], signal?: AbortSignal): Promise<{ stdout: string; stderr: string }> {
  const proc = Bun.spawn([YT_DLP_BIN, ...args], { stdout: 'pipe', stderr: 'pipe' });
  const onAbort = () => { try { proc.kill('SIGTERM'); } catch { /* ignore */ } };
  signal?.addEventListener('abort', onAbort);
  try {
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    if (signal?.aborted) throw new YtDlpError('aborted');
    if (exitCode !== 0) {
      throw new YtDlpError(`yt-dlp exited ${exitCode}: ${stderr.slice(0, 300)}`, stderr);
    }
    return { stdout, stderr };
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
}

export async function listChannelCandidates(
  channelUrl: string,
  limit: number,
  signal?: AbortSignal,
): Promise<{ channelTitle: string; videoIds: string[] }> {
  const { stdout } = await run(
    [
      '--flat-playlist',
      '--no-warnings',
      '-J',
      '-I', `1:${limit}`,
      channelUrl,
    ],
    signal,
  );
  let parsed: { title?: string; entries?: Array<{ id?: string }> };
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new YtDlpError('flat-playlist returned non-JSON');
  }
  const channelTitle = (parsed.title ?? '').replace(/ - Videos$/, '').trim();
  const videoIds = (parsed.entries ?? [])
    .map((e) => e.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
  return { channelTitle, videoIds };
}

interface RawFormat {
  format_id?: string;
  ext?: string;
  vcodec?: string;
  acodec?: string;
  height?: number;
  url?: string;
  protocol?: string;
}

interface RawVideoJson {
  id?: string;
  title?: string;
  view_count?: number;
  duration?: number;
  upload_date?: string;
  thumbnail?: string;
  formats?: RawFormat[];
}

function pickStreamUrl(formats: RawFormat[] | undefined): string | null {
  if (!formats || formats.length === 0) return null;
  const candidates = formats.filter((f) =>
    f.ext === 'mp4' &&
    typeof f.vcodec === 'string' && f.vcodec !== 'none' &&
    typeof f.url === 'string' && f.url.length > 0 &&
    (!f.protocol || /^https?$/.test(f.protocol))
  );
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort((a, b) => {
    const ha = a.height ?? 0;
    const hb = b.height ?? 0;
    if (ha <= 720 && hb <= 720) return hb - ha;
    if (ha > 720 && hb <= 720) return 1;
    if (hb > 720 && ha <= 720) return -1;
    return ha - hb;
  });
  return sorted[0]?.url ?? null;
}

export async function fetchVideoInfo(videoId: string, signal?: AbortSignal): Promise<VideoInfo> {
  const { stdout } = await run(
    ['-J', '--no-warnings', `https://youtu.be/${videoId}`],
    signal,
  );
  let parsed: RawVideoJson;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new YtDlpError(`fetchVideoInfo: non-JSON for ${videoId}`);
  }
  const upload = parsed.upload_date;
  const uploadDate = upload && /^\d{8}$/.test(upload)
    ? `${upload.slice(0, 4)}-${upload.slice(4, 6)}-${upload.slice(6, 8)}`
    : null;
  return {
    videoId,
    title: parsed.title ?? '',
    viewCount: parsed.view_count ?? 0,
    durationSec: Math.round(parsed.duration ?? 0),
    uploadDate,
    thumbnailUrl: parsed.thumbnail ?? null,
    streamUrl: pickStreamUrl(parsed.formats),
  };
}

export async function fetchVideoInfoBatch(
  videoIds: string[],
  concurrency: number,
  onProgress: (done: number, total: number, info: VideoInfo | null, err?: Error) => void,
  signal?: AbortSignal,
): Promise<VideoInfo[]> {
  const queue = [...videoIds];
  const results: VideoInfo[] = [];
  let done = 0;
  const total = videoIds.length;

  const workers = Array.from({ length: Math.min(concurrency, total) }, async () => {
    while (queue.length > 0 && !signal?.aborted) {
      const id = queue.shift();
      if (!id) break;
      try {
        const info = await fetchVideoInfo(id, signal);
        results.push(info);
        done++;
        onProgress(done, total, info);
      } catch (err) {
        done++;
        onProgress(done, total, null, err as Error);
      }
    }
  });
  await Promise.all(workers);
  return results;
}
