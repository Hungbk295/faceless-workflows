import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { eq, and } from 'drizzle-orm';
import {
  channelIdSchema,
  replaceScenesSchema,
  updateSceneSchema,
  sceneNumSchema,
  type SceneDto,
  type ReplaceScenesInput,
  type UpdateSceneInput,
} from 'shared';
import { db, schema } from '../db/client.ts';
import { validateJson, getValidatedJson } from '../middleware/validate.ts';

type SceneRow = typeof schema.scenes.$inferSelect;

function toDto(row: SceneRow): SceneDto {
  return {
    num: row.num,
    level: row.level ?? '',
    vo: row.vo,
    character: row.character ?? '',
    background: row.background ?? '',
    camera: row.camera ?? 'medium shot',
    duration: row.duration ?? 0,
    chars: row.chars ?? 0,
    words: row.words ?? 0,
  };
}

function parseChannelId(raw: string): string {
  const result = channelIdSchema.safeParse(raw);
  if (!result.success) {
    throw new HTTPException(400, { message: 'invalid channel id' });
  }
  return result.data;
}

function parseSceneNum(raw: string): number {
  const result = sceneNumSchema.safeParse(raw);
  if (!result.success) {
    throw new HTTPException(400, { message: 'invalid scene num' });
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

export const scenesRoute = new Hono();

scenesRoute.get('/', (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  const rows = db.select().from(schema.scenes)
    .where(eq(schema.scenes.channelId, channelId))
    .orderBy(schema.scenes.num)
    .all();
  return c.json(rows.map(toDto));
});

scenesRoute.put('/', validateJson(replaceScenesSchema), (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  const { scenes } = getValidatedJson<typeof replaceScenesSchema>(c) as ReplaceScenesInput;
  const seen = new Set<number>();
  for (const s of scenes) {
    if (seen.has(s.num)) {
      throw new HTTPException(400, { message: `duplicate scene num: ${s.num}` });
    }
    seen.add(s.num);
  }
  const inserted = db.transaction((tx) => {
    tx.delete(schema.scenes).where(eq(schema.scenes.channelId, channelId)).run();
    if (scenes.length === 0) return [];
    return tx.insert(schema.scenes).values(
      scenes.map((s) => ({
        channelId,
        num: s.num,
        level: s.level,
        vo: s.vo,
        character: s.character,
        background: s.background,
        camera: s.camera,
        duration: s.duration,
        chars: s.chars,
        words: s.words,
      })),
    ).returning().all();
  });
  return c.json(inserted.map(toDto));
});

scenesRoute.delete('/', (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  const removed = db.delete(schema.scenes)
    .where(eq(schema.scenes.channelId, channelId))
    .returning()
    .all();
  return c.json({ deleted: removed.length });
});

scenesRoute.on(['PATCH', 'PUT'], '/:num', validateJson(updateSceneSchema), (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  const num = parseSceneNum(c.req.param('num') ?? '');
  const patch = getValidatedJson<typeof updateSceneSchema>(c) as UpdateSceneInput;
  if (Object.keys(patch).length === 0) {
    throw new HTTPException(400, { message: 'empty update' });
  }
  const updated = db.update(schema.scenes)
    .set(patch)
    .where(and(eq(schema.scenes.channelId, channelId), eq(schema.scenes.num, num)))
    .returning()
    .get();
  if (!updated) throw new HTTPException(404, { message: 'scene not found' });
  return c.json(toDto(updated));
});

scenesRoute.delete('/:num', (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  const num = parseSceneNum(c.req.param('num') ?? '');
  const deleted = db.delete(schema.scenes)
    .where(and(eq(schema.scenes.channelId, channelId), eq(schema.scenes.num, num)))
    .returning()
    .get();
  if (!deleted) throw new HTTPException(404, { message: 'scene not found' });
  return c.json({ num: deleted.num, deleted: true });
});
