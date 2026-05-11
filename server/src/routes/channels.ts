import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { eq, desc } from 'drizzle-orm';
import {
  createChannelSchema,
  updateChannelSchema,
  channelIdSchema,
  type ChannelDto,
  type CreateChannelInput,
  type UpdateChannelInput,
} from 'shared';
import { db, schema } from '../db/client.ts';
import { newChannelId, nowIso } from '../lib/id.ts';
import { validateJson, getValidatedJson } from '../middleware/validate.ts';

type ChannelRow = typeof schema.channels.$inferSelect;

const VISUAL_KEYS = ['charStyle', 'bgStyle', 'sceneStyle', 'styleRef'] as const;

function toDto(row: ChannelRow): ChannelDto {
  return {
    id: row.id,
    name: row.name,
    niche: row.niche ?? '',
    lang: (row.lang ?? 'vi') as ChannelDto['lang'],
    refUrl: row.refUrl ?? '',
    refNotes: row.refNotes ?? '',
    refAnalysis: row.refAnalysis ?? '',
    dna: row.dna ?? '',
    style: row.style ?? '',
    topics: row.topics ?? '',
    thumbnails: row.thumbnails ?? '',
    metadata: row.metadata ?? '',
    currentScriptId: row.currentScriptId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseChannelId(raw: string): string {
  const result = channelIdSchema.safeParse(raw);
  if (!result.success) {
    throw new HTTPException(400, { message: 'invalid channel id' });
  }
  return result.data;
}

export const channelsRoute = new Hono();

channelsRoute.get('/', (c) => {
  const rows = db.select().from(schema.channels).orderBy(desc(schema.channels.createdAt)).all();
  return c.json(rows.map(toDto));
});

channelsRoute.get('/:id', (c) => {
  const id = parseChannelId(c.req.param('id'));
  const row = db.select().from(schema.channels).where(eq(schema.channels.id, id)).get();
  if (!row) throw new HTTPException(404, { message: 'channel not found' });
  return c.json(toDto(row));
});

channelsRoute.post('/', validateJson(createChannelSchema), (c) => {
  const input = getValidatedJson<typeof createChannelSchema>(c) as CreateChannelInput;
  const now = nowIso();
  const id = newChannelId();
  const inserted = db.transaction((tx) => {
    const row = tx.insert(schema.channels).values({
      id,
      name: input.name,
      niche: input.niche,
      lang: input.lang,
      createdAt: now,
      updatedAt: now,
    }).returning().get();
    tx.insert(schema.voiceConfig).values({ channelId: id }).run();
    tx.insert(schema.visualPrompts).values(
      VISUAL_KEYS.map((key) => ({ channelId: id, key, value: '' })),
    ).run();
    return row;
  });
  if (!inserted) throw new HTTPException(500, { message: 'failed to create channel' });
  return c.json(toDto(inserted), 201);
});

channelsRoute.on(['PATCH', 'PUT'], '/:id', validateJson(updateChannelSchema), (c) => {
  const id = parseChannelId(c.req.param('id'));
  const patch = getValidatedJson<typeof updateChannelSchema>(c) as UpdateChannelInput;
  if (Object.keys(patch).length === 0) {
    throw new HTTPException(400, { message: 'empty update' });
  }
  const updated = db.update(schema.channels)
    .set({ ...patch, updatedAt: nowIso() })
    .where(eq(schema.channels.id, id))
    .returning()
    .get();
  if (!updated) throw new HTTPException(404, { message: 'channel not found' });
  return c.json(toDto(updated));
});

channelsRoute.delete('/:id', (c) => {
  const id = parseChannelId(c.req.param('id'));
  const deleted = db.delete(schema.channels).where(eq(schema.channels.id, id)).returning().get();
  if (!deleted) throw new HTTPException(404, { message: 'channel not found' });
  return c.json({ id: deleted.id, deleted: true });
});
