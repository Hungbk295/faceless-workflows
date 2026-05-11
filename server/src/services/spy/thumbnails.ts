import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const FALLBACKS = (videoId: string) => [
  `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
  `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
  `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
];

async function tryFetch(url: string, signal?: AbortSignal): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 1024) return null;
    return buf;
  } catch {
    return null;
  }
}

export async function downloadThumbnail(
  preferredUrl: string | null,
  videoId: string,
  outPath: string,
  signal?: AbortSignal,
): Promise<void> {
  const candidates = preferredUrl
    ? [preferredUrl, ...FALLBACKS(videoId).filter((u) => u !== preferredUrl)]
    : FALLBACKS(videoId);
  for (const url of candidates) {
    const buf = await tryFetch(url, signal);
    if (buf) {
      await mkdir(dirname(outPath), { recursive: true });
      await Bun.write(outPath, buf);
      return;
    }
  }
  throw new Error(`failed to download thumbnail for ${videoId}`);
}
