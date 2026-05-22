import { rm } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import type { SpyProgressEvent, SpyStep } from 'shared';
import { db, schema } from '../../db/client.ts';
import { nowIso } from '../../lib/id.ts';
import { spyDirForChannel, spyFramePath, spyThumbPath } from '../filesystem.ts';
import {
  fetchStreamUrl,
  fetchVideoInfoBatch,
  listChannelCandidates,
  type VideoInfo,
} from './ytdlp.ts';
import { fetchTranscript } from './transcript.ts';
import { downloadThumbnail } from './thumbnails.ts';
import { extractFramesForVideo } from './frames.ts';

const SPY_TOP_N = Number(process.env.SPY_TOP_N || 10);
const SPY_SCAN_LIMIT = Number(process.env.SPY_SCAN_LIMIT || 100);
const SPY_FRAMES_FROM = Number(process.env.SPY_FRAMES_FROM || 3);
const SPY_FRAMES_PER_VIDEO = Number(process.env.SPY_FRAMES_PER_VIDEO || 3);
const SPY_MIN_DURATION = Number(process.env.SPY_MIN_DURATION || 60); // filter Shorts (<60s)
const YTDLP_CONCURRENCY = Number(process.env.YT_DLP_CONCURRENCY || 8);
const TRANSCRIPT_CONCURRENCY = Number(process.env.TRANSCRIPT_CONCURRENCY || 4);
const THUMBNAIL_CONCURRENCY = Number(process.env.THUMBNAIL_CONCURRENCY || 5);

interface JobState {
  ctrl: AbortController;
  emitter: EventTarget;
}

const jobs = new Map<string, JobState>();

/**
 * Ensure the URL hits the channel's full /videos tab, not /featured (~12 items)
 * or /shorts (all Shorts). Pass through if already a valid playlist URL.
 */
function normalizeChannelUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return trimmed;
  // Strip any query/fragment first
  const noQuery = trimmed.split(/[?#]/)[0] ?? trimmed;
  // If it already ends with /videos /shorts /streams /playlists, leave it
  if (/\/(videos|shorts|streams|playlists)$/.test(noQuery)) return noQuery;
  // If it's a playlist URL, leave it
  if (/playlist\?list=/.test(trimmed) || /\/playlist\//.test(trimmed)) return trimmed;
  // Otherwise append /videos
  return `${noQuery}/videos`;
}

export function getYoutubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  const id = match?.[2];
  return (id && id.length === 11) ? id : null;
}

export function getEmitter(channelId: string): EventTarget | null {
  return jobs.get(channelId)?.emitter ?? null;
}

export function isRunning(channelId: string): boolean {
  return jobs.has(channelId);
}

function emit(emitter: EventTarget, ev: SpyProgressEvent): void {
  emitter.dispatchEvent(new CustomEvent('spy', { detail: ev }));
}

async function clearChannelData(channelId: string): Promise<void> {
  db.delete(schema.spyVideos).where(eq(schema.spyVideos.channelId, channelId)).run();
  try {
    await rm(spyDirForChannel(channelId), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

function persistRun(channelId: string, patch: Partial<typeof schema.spyRuns.$inferInsert>): void {
  const existing = db.select().from(schema.spyRuns)
    .where(eq(schema.spyRuns.channelId, channelId))
    .get();
  if (existing) {
    db.update(schema.spyRuns).set(patch).where(eq(schema.spyRuns.channelId, channelId)).run();
  } else {
    db.insert(schema.spyRuns).values({
      channelId,
      sourceUrl: patch.sourceUrl ?? '',
      channelTitle: patch.channelTitle ?? '',
      status: patch.status ?? 'idle',
      step: patch.step,
      progress: patch.progress ?? 0,
      total: patch.total ?? 0,
      error: patch.error,
      startedAt: patch.startedAt,
      completedAt: patch.completedAt,
    }).run();
  }
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
  signal: AbortSignal,
): Promise<void> {
  const queue = items.map((item, index) => ({ item, index }));
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0 && !signal.aborted) {
      const next = queue.shift();
      if (!next) break;
      await worker(next.item, next.index);
    }
  });
  await Promise.all(workers);
}

export async function startSpyRun(
  channelId: string,
  sourceUrl: string,
  framesCount?: number,
): Promise<EventTarget> {
  const prior = jobs.get(channelId);
  if (prior) {
    prior.ctrl.abort();
    jobs.delete(channelId);
  }

  const ctrl = new AbortController();
  const emitter = new EventTarget();
  jobs.set(channelId, { ctrl, emitter });

  await clearChannelData(channelId);

  persistRun(channelId, {
    sourceUrl,
    channelTitle: '',
    status: 'running',
    step: 'list',
    progress: 0,
    total: 0,
    error: null,
    startedAt: nowIso(),
    completedAt: null,
  });

  emit(emitter, { type: 'progress', step: 'list', progress: 0, total: 0, message: 'Listing videos' });

  pipeline(channelId, sourceUrl, framesCount, ctrl.signal, emitter)
    .catch((err) => {
      if (ctrl.signal.aborted) return;
      const message = err instanceof Error ? err.message : String(err);
      persistRun(channelId, {
        status: 'error',
        error: message,
        completedAt: nowIso(),
      });
      emit(emitter, { type: 'error', step: null, progress: 0, total: 0, message });
    })
    .finally(() => {
      if (jobs.get(channelId)?.ctrl === ctrl) {
        jobs.delete(channelId);
      }
    });

  return emitter;
}

async function pipeline(
  channelId: string,
  sourceUrl: string,
  customFramesCount: number | undefined,
  signal: AbortSignal,
  emitter: EventTarget,
): Promise<void> {
  const singleVideoId = getYoutubeVideoId(sourceUrl);
  const isSingleVideo = !!singleVideoId;

  let channelTitle = '';
  let videoIds: string[] = [];

  if (isSingleVideo && singleVideoId) {
    console.log(`[spy] recognized single video URL: ${singleVideoId}`);
    channelTitle = `Video Reference`;
    videoIds = [singleVideoId];
  } else {
    // 1. List candidates. Normalize URL so we always hit the /videos tab
    // (a bare channel URL gives /featured which only lists ~12 curated items).
    const normalizedUrl = normalizeChannelUrl(sourceUrl);
    console.log(`[spy] listing candidates from ${normalizedUrl} (limit=${SPY_SCAN_LIMIT})`);
    const res = await listChannelCandidates(normalizedUrl, SPY_SCAN_LIMIT, signal);
    channelTitle = res.channelTitle;
    videoIds = res.videoIds;
  }

  if (signal.aborted) return;
  if (videoIds.length === 0) throw new Error(`no videos found at ${sourceUrl}`);
  console.log(`[spy] got ${videoIds.length} candidate ids from "${channelTitle}"`);

  persistRun(channelId, {
    channelTitle,
    step: 'metadata',
    progress: 0,
    total: videoIds.length,
  });
  emit(emitter, {
    type: 'progress', step: 'metadata', progress: 0, total: videoIds.length,
    message: `Fetching info for ${videoIds.length} candidates`,
  });

  // 2. Fetch metadata in parallel
  const infos = await fetchVideoInfoBatch(
    videoIds,
    YTDLP_CONCURRENCY,
    (done, total) => {
      persistRun(channelId, { progress: done, total });
      emit(emitter, { type: 'progress', step: 'metadata', progress: done, total });
    },
    signal,
  );
  if (signal.aborted) return;

  // 3. Filter out Shorts (< SPY_MIN_DURATION) then sort by view count, take top N
  const totalFetched = infos.length;
  const longForm = isSingleVideo ? infos : infos.filter((v) => v.durationSec >= SPY_MIN_DURATION);
  const durationsDesc = [...infos].map((v) => v.durationSec).sort((a, b) => b - a);
  const top5Dur = durationsDesc.slice(0, 5).join(', ');
  console.log(`[spy] metadata: ${totalFetched}/${videoIds.length} succeeded, ${longForm.length} long-form. top5 durations: ${top5Dur}`);

  // Fallback: if everything is short-form, still surface results (rank by views)
  // so the user gets *something* and can lower SPY_MIN_DURATION if needed.
  let pool = longForm;
  if (pool.length === 0 && totalFetched > 0) {
    console.warn(`[spy] no videos >= ${SPY_MIN_DURATION}s — falling back to short-form. Channel may be Shorts-only.`);
    pool = infos;
  }

  const topVideos = isSingleVideo
    ? pool.slice(0, 1)
    : [...pool].sort((a, b) => b.viewCount - a.viewCount).slice(0, SPY_TOP_N);

  if (topVideos.length === 0) {
    throw new Error(
      `no usable videos: scanned=${videoIds.length}, metadata_ok=${totalFetched}, long_form=${longForm.length}. ` +
      `Check that the URL is a channel page (got: ${sourceUrl}).`,
    );
  }

  // Insert spy_videos rows
  interface RankedVideo { info: VideoInfo; rowId: number; rank: number; }
  const ranked: RankedVideo[] = topVideos.map((v, i) => {
    const row = db.insert(schema.spyVideos).values({
      channelId,
      videoId: v.videoId,
      rank: i + 1,
      title: v.title,
      viewCount: v.viewCount,
      durationSec: v.durationSec,
      publishedAt: v.uploadDate,
      transcriptStatus: 'pending',
      framesStatus: i < (isSingleVideo ? 1 : SPY_FRAMES_FROM) ? 'pending' : 'skipped',
    }).returning({ id: schema.spyVideos.id }).get();
    return { info: v, rowId: row.id, rank: i + 1 };
  });

  // 4. Thumbnails (parallel)
  persistRun(channelId, { step: 'thumbnails', progress: 0, total: ranked.length });
  emit(emitter, {
    type: 'progress', step: 'thumbnails', progress: 0, total: ranked.length,
    message: 'Downloading thumbnails',
  });

  let thumbsDone = 0;
  await runWithConcurrency(ranked, THUMBNAIL_CONCURRENCY, async (rv) => {
    const outPath = spyThumbPath(channelId, rv.info.videoId);
    try {
      await downloadThumbnail(rv.info.thumbnailUrl, rv.info.videoId, outPath, signal);
      db.update(schema.spyVideos)
        .set({ thumbnailPath: outPath })
        .where(eq(schema.spyVideos.id, rv.rowId))
        .run();
    } catch {
      /* leave thumbnailPath null */
    }
    thumbsDone++;
    persistRun(channelId, { progress: thumbsDone });
    emit(emitter, { type: 'progress', step: 'thumbnails', progress: thumbsDone, total: ranked.length });
  }, signal);
  if (signal.aborted) return;

  // 5. Transcripts (parallel)
  persistRun(channelId, { step: 'transcripts', progress: 0, total: ranked.length });
  emit(emitter, {
    type: 'progress', step: 'transcripts', progress: 0, total: ranked.length,
    message: 'Fetching transcripts',
  });

  let trDone = 0;
  await runWithConcurrency(ranked, TRANSCRIPT_CONCURRENCY, async (rv) => {
    const tr = await fetchTranscript(rv.info.videoId).catch(() => ({
      text: '', status: 'error' as const, lang: null,
    }));
    db.update(schema.spyVideos)
      .set({ transcript: tr.text, transcriptStatus: tr.status })
      .where(eq(schema.spyVideos.id, rv.rowId))
      .run();
    trDone++;
    persistRun(channelId, { progress: trDone });
    emit(emitter, { type: 'progress', step: 'transcripts', progress: trDone, total: ranked.length });
  }, signal);
  if (signal.aborted) return;

  // 6. Frames for top N videos
  const framesTargets = ranked.slice(0, isSingleVideo ? 1 : SPY_FRAMES_FROM);
  const framesPerVideo = customFramesCount ?? (isSingleVideo ? 20 : SPY_FRAMES_PER_VIDEO);
  const framesTotal = framesTargets.length * framesPerVideo;
  persistRun(channelId, { step: 'frames', progress: 0, total: framesTotal });
  emit(emitter, {
    type: 'progress', step: 'frames', progress: 0, total: framesTotal,
    message: 'Extracting frames',
  });

  let framesDone = 0;
  for (const rv of framesTargets) {
    if (signal.aborted) return;
    const { info: v, rowId: videoRowId } = rv;
    if (v.durationSec <= 0) {
      db.update(schema.spyVideos).set({ framesStatus: 'error' }).where(eq(schema.spyVideos.id, videoRowId)).run();
      framesDone += framesPerVideo;
      persistRun(channelId, { progress: framesDone });
      emit(emitter, { type: 'progress', step: 'frames', progress: framesDone, total: framesTotal });
      continue;
    }
    const outPaths = Array.from({ length: framesPerVideo }, (_, k) =>
      spyFramePath(channelId, v.videoId, k + 1),
    );
    try {
      // Fetch fresh stream URL right before extracting (the metadata-phase URL
      // may have aged 30s+ and DASH URLs can throttle on stale clients).
      const initialUrl = await fetchStreamUrl(v.videoId, signal);
      const refresh = () => fetchStreamUrl(v.videoId, signal);
      await extractFramesForVideo(
        initialUrl,
        refresh,
        v.durationSec,
        outPaths,
        (idx, ts, path) => {
          db.insert(schema.spyFrames).values({
            videoRowId,
            idx,
            timestampSec: ts,
            framePath: path,
          }).run();
          framesDone++;
          persistRun(channelId, { progress: framesDone });
          emit(emitter, { type: 'progress', step: 'frames', progress: framesDone, total: framesTotal });
        },
        signal,
      );
      db.update(schema.spyVideos).set({ framesStatus: 'ok' }).where(eq(schema.spyVideos.id, videoRowId)).run();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[spy/frames] video ${v.videoId} failed: ${msg}`);
      db.update(schema.spyVideos).set({ framesStatus: 'error' }).where(eq(schema.spyVideos.id, videoRowId)).run();
      const remaining = framesPerVideo - (framesDone % framesPerVideo);
      framesDone += remaining === framesPerVideo ? 0 : remaining;
      persistRun(channelId, { progress: framesDone });
      emit(emitter, { type: 'progress', step: 'frames', progress: framesDone, total: framesTotal });
    }
  }

  // 7. Done
  persistRun(channelId, {
    status: 'done',
    step: 'done',
    completedAt: nowIso(),
  });
  emit(emitter, { type: 'done', step: 'done', progress: framesDone, total: framesTotal, message: 'Spy complete' });
}

export async function cancelSpyRun(channelId: string): Promise<boolean> {
  const job = jobs.get(channelId);
  if (!job) return false;
  job.ctrl.abort();
  jobs.delete(channelId);
  persistRun(channelId, { status: 'idle', step: null, completedAt: nowIso(), error: 'cancelled' });
  return true;
}

export async function deleteSpyData(channelId: string): Promise<void> {
  await cancelSpyRun(channelId);
  await clearChannelData(channelId);
  db.delete(schema.spyRuns).where(eq(schema.spyRuns.channelId, channelId)).run();
}

// Re-export for type hinting downstream
export type { SpyStep };
