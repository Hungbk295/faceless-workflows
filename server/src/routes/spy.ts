import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { HTTPException } from 'hono/http-exception';
import { eq, inArray, asc, and } from 'drizzle-orm';
import {
  channelIdSchema,
  spyRunInputSchema,
  type SpyFrameDto,
  type SpyProgressEvent,
  type SpyResultDto,
  type SpyRunDto,
  type SpyRunInput,
  type SpyRunStatus,
  type SpyStep,
  type SpyTranscriptStatus,
  type SpyFramesStatus,
  type SpyVideoDto,
} from 'shared';
import { db, schema } from '../db/client.ts';
import { validateJson, getValidatedJson } from '../middleware/validate.ts';
import {
  cancelSpyRun,
  deleteSpyData,
  getEmitter,
  isRunning,
  startSpyRun,
} from '../services/spy/job.ts';

function parseChannelId(raw: string): string {
  const result = channelIdSchema.safeParse(raw);
  if (!result.success) {
    throw new HTTPException(400, { message: 'invalid channel id' });
  }
  return result.data;
}

function ensureChannelExists(channelId: string): void {
  const row = db.select({ id: schema.channels.id })
    .from(schema.channels)
    .where(eq(schema.channels.id, channelId))
    .get();
  if (!row) throw new HTTPException(404, { message: 'channel not found' });
}

function loadResult(channelId: string): SpyResultDto {
  const runRow = db.select().from(schema.spyRuns)
    .where(eq(schema.spyRuns.channelId, channelId))
    .get();
  const videoRows = db.select().from(schema.spyVideos)
    .where(eq(schema.spyVideos.channelId, channelId))
    .orderBy(asc(schema.spyVideos.rank))
    .all();
  const ids = videoRows.map((v) => v.id);
  const frameRows = ids.length > 0
    ? db.select().from(schema.spyFrames)
        .where(inArray(schema.spyFrames.videoRowId, ids))
        .orderBy(asc(schema.spyFrames.idx))
        .all()
    : [];
  const videoByRowId = new Map<number, typeof videoRows[number]>();
  for (const v of videoRows) videoByRowId.set(v.id, v);
  const framesByVideo = new Map<number, SpyFrameDto[]>();
  for (const f of frameRows) {
    const v = videoByRowId.get(f.videoRowId);
    if (!v) continue;
    const arr = framesByVideo.get(f.videoRowId) ?? [];
    arr.push({
      idx: f.idx,
      timestampSec: f.timestampSec,
      url: `/api/channels/${channelId}/spy/files/frame/${encodeURIComponent(v.videoId)}/${f.idx}`,
      path: f.framePath,
    });
    framesByVideo.set(f.videoRowId, arr);
  }
  const videos: SpyVideoDto[] = videoRows.map((v) => ({
    videoId: v.videoId,
    rank: v.rank,
    title: v.title,
    viewCount: v.viewCount,
    durationSec: v.durationSec,
    publishedAt: v.publishedAt,
    thumbnailUrl: v.thumbnailPath
      ? `/api/channels/${channelId}/spy/files/thumb/${encodeURIComponent(v.videoId)}`
      : null,
    thumbnailPath: v.thumbnailPath,
    transcript: v.transcript,
    transcriptStatus: v.transcriptStatus as SpyTranscriptStatus,
    framesStatus: v.framesStatus as SpyFramesStatus,
    frames: framesByVideo.get(v.id) ?? [],
  }));
  const run: SpyRunDto | null = runRow ? {
    status: (isRunning(channelId) ? 'running' : runRow.status) as SpyRunStatus,
    step: (runRow.step ?? null) as SpyStep | null,
    progress: runRow.progress,
    total: runRow.total,
    sourceUrl: runRow.sourceUrl,
    channelTitle: runRow.channelTitle,
    startedAt: runRow.startedAt,
    completedAt: runRow.completedAt,
    error: runRow.error,
  } : null;
  return { run, videos };
}

export const spyRoute = new Hono();

spyRoute.get('/', (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  return c.json(loadResult(channelId));
});

spyRoute.post('/run', validateJson(spyRunInputSchema), async (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  const { url } = getValidatedJson<typeof spyRunInputSchema>(c) as SpyRunInput;
  await startSpyRun(channelId, url);
  return c.json({ running: true });
});

spyRoute.post('/cancel', async (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  const cancelled = await cancelSpyRun(channelId);
  return c.json({ cancelled });
});

spyRoute.delete('/', async (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  await deleteSpyData(channelId);
  return c.json({ deleted: true });
});

spyRoute.get('/events', (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  const emitter = getEmitter(channelId);
  return streamSSE(c, async (stream) => {
    if (!emitter) {
      await stream.writeSSE({
        event: 'idle',
        data: JSON.stringify({ message: 'no active job' }),
      });
      return;
    }
    let closed = false;
    const handler = (e: Event) => {
      const ev = (e as CustomEvent<SpyProgressEvent>).detail;
      if (closed) return;
      void stream.writeSSE({
        event: ev.type,
        data: JSON.stringify(ev),
      });
      if (ev.type === 'done' || ev.type === 'error') {
        closed = true;
        emitter.removeEventListener('spy', handler);
        void stream.close();
      }
    };
    emitter.addEventListener('spy', handler);
    c.req.raw.signal.addEventListener('abort', () => {
      closed = true;
      emitter.removeEventListener('spy', handler);
    });
    // Keep stream open until handler closes it or client disconnects.
    await new Promise<void>((resolve) => {
      const tick = setInterval(() => {
        if (closed || c.req.raw.signal.aborted) {
          clearInterval(tick);
          resolve();
        }
      }, 500);
    });
  });
});

function safeServeImage(path: string | null | undefined): Response {
  if (!path) throw new HTTPException(404, { message: 'not found' });
  const file = Bun.file(path);
  return new Response(file.stream(), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

function findVideoRow(channelId: string, videoId: string) {
  return db.select().from(schema.spyVideos)
    .where(and(eq(schema.spyVideos.channelId, channelId), eq(schema.spyVideos.videoId, videoId)))
    .get();
}

spyRoute.get('/files/thumb/:videoId', (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  const videoId = c.req.param('videoId') ?? '';
  const row = findVideoRow(channelId, videoId);
  return safeServeImage(row?.thumbnailPath ?? null);
});

spyRoute.get('/files/frame/:videoId/:idx', (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  const videoId = c.req.param('videoId') ?? '';
  const idx = Number(c.req.param('idx') ?? '0');
  const video = findVideoRow(channelId, videoId);
  if (!video) throw new HTTPException(404, { message: 'video not found' });
  const frame = db.select().from(schema.spyFrames)
    .where(and(eq(schema.spyFrames.videoRowId, video.id), eq(schema.spyFrames.idx, idx)))
    .get();
  return safeServeImage(frame?.framePath ?? null);
});
