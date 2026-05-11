import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { eq, and, sql } from 'drizzle-orm';
import {
  channelIdSchema,
  createScriptSchema,
  updateScriptSchema,
  scriptIdSchema,
  type ScriptDto,
  type CreateScriptInput,
  type UpdateScriptInput,
} from 'shared';
import { db, schema } from '../db/client.ts';
import { newScriptId, nowIso } from '../lib/id.ts';
import { validateJson, getValidatedJson } from '../middleware/validate.ts';

type ScriptRow = typeof schema.scripts.$inferSelect;

function toDto(row: ScriptRow): ScriptDto {
  return {
    id: row.id,
    channelId: row.channelId,
    idx: row.idx,
    topic: row.topic ?? '',
    hook: row.hook ?? '',
    angle: row.angle ?? '',
    pillar: (row.pillar ?? 'P1') as ScriptDto['pillar'],
    minutes: row.minutes ?? 18,
    structure: row.structure ?? 'auto',
    sections: row.sections ?? 'auto',
    pov: row.pov ?? 'mixed-1-2-3',
    customStructure: row.customStructure ?? '',
    scriptText: row.scriptText,
    createdAt: row.createdAt,
  };
}

function parseChannelId(raw: string): string {
  const result = channelIdSchema.safeParse(raw);
  if (!result.success) {
    throw new HTTPException(400, { message: 'invalid channel id' });
  }
  return result.data;
}

function parseScriptId(raw: string): string {
  const result = scriptIdSchema.safeParse(raw);
  if (!result.success) {
    throw new HTTPException(400, { message: 'invalid script id' });
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

export const scriptsRoute = new Hono();

scriptsRoute.get('/', (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  const rows = db.select().from(schema.scripts)
    .where(eq(schema.scripts.channelId, channelId))
    .orderBy(schema.scripts.idx)
    .all();
  return c.json(rows.map(toDto));
});

scriptsRoute.get('/:scriptId', (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  const scriptId = parseScriptId(c.req.param('scriptId') ?? '');
  const row = db.select().from(schema.scripts)
    .where(and(eq(schema.scripts.channelId, channelId), eq(schema.scripts.id, scriptId)))
    .get();
  if (!row) throw new HTTPException(404, { message: 'script not found' });
  return c.json(toDto(row));
});

scriptsRoute.post('/', validateJson(createScriptSchema), (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  const input = getValidatedJson<typeof createScriptSchema>(c) as CreateScriptInput;
  const id = newScriptId();
  const createdAt = nowIso();
  const inserted = db.transaction((tx) => {
    const countRow = tx.select({ value: sql<number>`COUNT(*)` })
      .from(schema.scripts)
      .where(eq(schema.scripts.channelId, channelId))
      .get();
    const idx = countRow?.value ?? 0;
    return tx.insert(schema.scripts).values({
      id,
      channelId,
      idx,
      topic: input.topic,
      hook: input.hook,
      angle: input.angle,
      pillar: input.pillar,
      minutes: input.minutes,
      structure: input.structure,
      sections: input.sections,
      pov: input.pov,
      customStructure: input.customStructure,
      scriptText: input.scriptText,
      createdAt,
    }).returning().get();
  });
  if (!inserted) throw new HTTPException(500, { message: 'failed to create script' });
  return c.json(toDto(inserted), 201);
});

scriptsRoute.on(['PATCH', 'PUT'], '/:scriptId', validateJson(updateScriptSchema), (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  const scriptId = parseScriptId(c.req.param('scriptId') ?? '');
  const patch = getValidatedJson<typeof updateScriptSchema>(c) as UpdateScriptInput;
  if (Object.keys(patch).length === 0) {
    throw new HTTPException(400, { message: 'empty update' });
  }
  const updated = db.update(schema.scripts)
    .set(patch)
    .where(and(eq(schema.scripts.channelId, channelId), eq(schema.scripts.id, scriptId)))
    .returning()
    .get();
  if (!updated) throw new HTTPException(404, { message: 'script not found' });
  return c.json(toDto(updated));
});

scriptsRoute.delete('/:scriptId', (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  const scriptId = parseScriptId(c.req.param('scriptId') ?? '');
  const deleted = db.transaction((tx) => {
    const row = tx.delete(schema.scripts)
      .where(and(eq(schema.scripts.channelId, channelId), eq(schema.scripts.id, scriptId)))
      .returning()
      .get();
    if (!row) return null;
    tx.update(schema.channels)
      .set({ currentScriptId: null, updatedAt: nowIso() })
      .where(and(eq(schema.channels.id, channelId), eq(schema.channels.currentScriptId, scriptId)))
      .run();
    return row;
  });
  if (!deleted) throw new HTTPException(404, { message: 'script not found' });
  return c.json({ id: deleted.id, deleted: true });
});
