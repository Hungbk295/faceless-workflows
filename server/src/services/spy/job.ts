import { rm } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import type { SpyProgressEvent, SpyStep } from 'shared';
import { db, schema } from '../../db/client.ts';
import { nowIso } from '../../lib/id.ts';
import { spyDirForChannel, spyFramePath, spyThumbPath } from '../filesystem.ts';
import {
  fetchVideoInfoBatch,
  listChannelCandidates,
  type VideoInfo,
} from './ytdlp.ts';
import { fetchTranscript } from './transcript.ts';
import { downloadThumbnail } from './thumbnails.ts';
import { extractFramesForVideo } from './frames.ts';

const SPY_TOP_N = Number(process.env.SPY_TOP_N || 10);
const SPY_SCAN_LIMIT = Number(process.env.SPY_SCAN_LIMIT || 30);
const SPY_FRAMES_FROM = Number(process.env.SPY_FRAMES_FROM || 3);
const SPY_FRAMES_PER_VIDEO = Number(process.env.SPY_FRAMES_PER_VIDEO || 3);
const YTDLP_CONCURRENCY = Number(process.env.YT_DLP_CONCURRENCY || 5);
const TRANSCRIPT_CONCURRENCY = Number(process.env.TRANSCRIPT_CONCURRENCY || 4);
const THUMBNAIL_CONCURRENCY = Number(process.env.THUMBNAIL_CONCURRENCY || 5);

interface JobState {
  ctrl: AbortController;
  emitter: EventTarget;
}

const jobs = new Map<string, JobState>();

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

export async function startSpyRun(channelId: string, sourceUrl: string): Promise<EventTarget> {
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

  pipeline(channelId, sourceUrl, ctrl.signal, emitter)
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
  signal: AbortSignal,
  emitter: EventTarget,
): Promise<void> {
  // 1. List candidates
  const { channelTitle, videoIds } = await listChannelCandidates(sourceUrl, SPY_SCAN_LIMIT, signal);
  if (signal.aborted) return;
  if (videoIds.length === 0) throw new Error('no videos found on channel');

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

  // 3. Sort by view count, take top N
  const topVideos = [...infos]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, SPY_TOP_N);

  if (topVideos.length === 0) throw new Error('no usable videos after metadata fetch');

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
      framesStatus: i < SPY_FRAMES_FROM ? 'pending' : 'skipped',
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
  const framesTargets = ranked.slice(0, SPY_FRAMES_FROM);
  const framesTotal = framesTargets.length * SPY_FRAMES_PER_VIDEO;
  persistRun(channelId, { step: 'frames', progress: 0, total: framesTotal });
  emit(emitter, {
    type: 'progress', step: 'frames', progress: 0, total: framesTotal,
    message: 'Extracting frames',
  });

  let framesDone = 0;
  for (const rv of framesTargets) {
    if (signal.aborted) return;
    const { info: v, rowId: videoRowId } = rv;
    if (!v.streamUrl || v.durationSec <= 0) {
      db.update(schema.spyVideos).set({ framesStatus: 'error' }).where(eq(schema.spyVideos.id, videoRowId)).run();
      framesDone += SPY_FRAMES_PER_VIDEO;
      persistRun(channelId, { progress: framesDone });
      emit(emitter, { type: 'progress', step: 'frames', progress: framesDone, total: framesTotal });
      continue;
    }
    const outPaths = Array.from({ length: SPY_FRAMES_PER_VIDEO }, (_, k) =>
      spyFramePath(channelId, v.videoId, k + 1),
    );
    try {
      const frames = await extractFramesForVideo(v.streamUrl, v.durationSec, outPaths, signal);
      for (const f of frames) {
        db.insert(schema.spyFrames).values({
          videoRowId,
          idx: f.idx,
          timestampSec: f.timestampSec,
          framePath: f.path,
        }).run();
        framesDone++;
        persistRun(channelId, { progress: framesDone });
        emit(emitter, { type: 'progress', step: 'frames', progress: framesDone, total: framesTotal });
      }
      db.update(schema.spyVideos).set({ framesStatus: 'ok' }).where(eq(schema.spyVideos.id, videoRowId)).run();
    } catch {
      db.update(schema.spyVideos).set({ framesStatus: 'error' }).where(eq(schema.spyVideos.id, videoRowId)).run();
      const remaining = SPY_FRAMES_PER_VIDEO - (framesDone % SPY_FRAMES_PER_VIDEO);
      framesDone += remaining === SPY_FRAMES_PER_VIDEO ? 0 : remaining;
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
