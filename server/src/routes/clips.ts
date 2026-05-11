import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { eq, and } from 'drizzle-orm';
import { stat } from 'node:fs/promises';
import {
  channelIdSchema,
  generateVoiceClipSchema,
  type VoiceClipDto,
  type GenerateVoiceClipInput,
} from 'shared';
import { db, schema } from '../db/client.ts';
import { nowIso } from '../lib/id.ts';
import { validateJson, getValidatedJson } from '../middleware/validate.ts';
import {
  generateElevenLabsAudio,
  writeClip,
  deleteClipFile,
  deleteAllClipsForChannel,
  TTSError,
  type ElevenLabsVoiceParams,
} from '../services/voiceClips.ts';

type ClipRow = typeof schema.voiceClips.$inferSelect;

function toDto(channelId: string, row: ClipRow): VoiceClipDto {
  return {
    num: row.num,
    status: row.status as VoiceClipDto['status'],
    size: row.size,
    generatedAt: row.generatedAt,
    error: row.error,
    url: `/api/channels/${channelId}/clips/${String(row.num).padStart(3, '0')}.mp3`,
  };
}

function parseChannelId(raw: string): string {
  const result = channelIdSchema.safeParse(raw);
  if (!result.success) {
    throw new HTTPException(400, { message: 'invalid channel id' });
  }
  return result.data;
}

function parseSceneNumFromFile(raw: string): number {
  const m = raw.match(/^(\d{1,4})\.mp3$/);
  if (!m) throw new HTTPException(400, { message: 'invalid clip filename' });
  return parseInt(m[1]!, 10);
}

function ensureChannelExists(channelId: string): void {
  const row = db.select({ id: schema.channels.id })
    .from(schema.channels)
    .where(eq(schema.channels.id, channelId))
    .get();
  if (!row) throw new HTTPException(404, { message: 'channel not found' });
}

function loadVoiceConfig(channelId: string): ElevenLabsVoiceParams {
  const row = db.select().from(schema.voiceConfig)
    .where(eq(schema.voiceConfig.channelId, channelId))
    .get();
  return {
    apiKey: row?.apiKey ?? '',
    voiceId: row?.voiceId ?? '',
    modelId: row?.modelId ?? 'eleven_multilingual_v2',
    languageCode: row?.languageCode ?? 'vi',
    stability: row?.stability ?? 0.5,
    similarityBoost: row?.similarityBoost ?? 0.75,
    speed: row?.speed ?? 1.0,
  };
}

function upsertClipRow(
  channelId: string,
  num: number,
  fields: Partial<typeof schema.voiceClips.$inferInsert>,
): ClipRow {
  return db.transaction((tx) => {
    const existing = tx.select().from(schema.voiceClips)
      .where(and(eq(schema.voiceClips.channelId, channelId), eq(schema.voiceClips.num, num)))
      .get();
    if (existing) {
      const updated = tx.update(schema.voiceClips)
        .set(fields)
        .where(and(eq(schema.voiceClips.channelId, channelId), eq(schema.voiceClips.num, num)))
        .returning()
        .get();
      if (!updated) throw new HTTPException(500, { message: 'failed to update clip row' });
      return updated;
    }
    const inserted = tx.insert(schema.voiceClips).values({
      channelId,
      num,
      status: 'pending',
      ...fields,
    }).returning().get();
    if (!inserted) throw new HTTPException(500, { message: 'failed to insert clip row' });
    return inserted;
  });
}

export const clipsRoute = new Hono();

clipsRoute.get('/', (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  const rows = db.select().from(schema.voiceClips)
    .where(eq(schema.voiceClips.channelId, channelId))
    .orderBy(schema.voiceClips.num)
    .all();
  return c.json(rows.map((r) => toDto(channelId, r)));
});

clipsRoute.get('/:filename', async (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  const filename = c.req.param('filename') ?? '';
  const num = parseSceneNumFromFile(filename);
  const row = db.select().from(schema.voiceClips)
    .where(and(eq(schema.voiceClips.channelId, channelId), eq(schema.voiceClips.num, num)))
    .get();
  if (!row || row.status !== 'done' || !row.filePath) {
    throw new HTTPException(404, { message: 'clip not found' });
  }
  const file = Bun.file(row.filePath);
  if (!(await file.exists())) {
    throw new HTTPException(404, { message: 'clip file missing on disk' });
  }
  return new Response(file, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-cache',
    },
  });
});

clipsRoute.delete('/:filename', async (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  const filename = c.req.param('filename') ?? '';
  const num = parseSceneNumFromFile(filename);
  const row = db.delete(schema.voiceClips)
    .where(and(eq(schema.voiceClips.channelId, channelId), eq(schema.voiceClips.num, num)))
    .returning()
    .get();
  if (!row) throw new HTTPException(404, { message: 'clip not found' });
  await deleteClipFile(channelId, num);
  return c.json({ num, deleted: true });
});

clipsRoute.delete('/', async (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  db.delete(schema.voiceClips).where(eq(schema.voiceClips.channelId, channelId)).run();
  const removed = await deleteAllClipsForChannel(channelId);
  return c.json({ deleted: true, files: removed });
});

// Voice generate route — mounted at /api/channels/:channelId/voice
export const voiceRoute = new Hono();

voiceRoute.post('/generate', validateJson(generateVoiceClipSchema), async (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  const { num, text } = getValidatedJson<typeof generateVoiceClipSchema>(c) as GenerateVoiceClipInput;
  const config = loadVoiceConfig(channelId);

  upsertClipRow(channelId, num, { status: 'processing', error: null });

  try {
    const audio = await generateElevenLabsAudio(config, text);
    const { filePath, size } = await writeClip(channelId, num, audio);
    let actualSize = size;
    try {
      const s = await stat(filePath);
      actualSize = s.size;
    } catch { /* fallback to buffer size */ }
    const updated = upsertClipRow(channelId, num, {
      status: 'done',
      filePath,
      size: actualSize,
      generatedAt: nowIso(),
      error: null,
    });
    return c.json(toDto(channelId, updated));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = err instanceof TTSError ? err.status : 500;
    upsertClipRow(channelId, num, { status: 'error', error: message });
    throw new HTTPException(status === 400 ? 400 : 502, { message });
  }
});

