import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { eq, and } from 'drizzle-orm';
import {
  channelIdSchema,
  replaceScenePromptsSchema,
  appendScenePromptsSchema,
  type ScenePromptsDto,
  type ScenePromptDto,
  type ReplaceScenePromptsInput,
  type AppendScenePromptsInput,
  type ScenePromptInput,
} from 'shared';
import { db, schema } from '../db/client.ts';
import { validateJson, getValidatedJson } from '../middleware/validate.ts';

type PromptRow = typeof schema.scenePrompts.$inferSelect;

function toDto(row: PromptRow): ScenePromptDto {
  return {
    num: row.num,
    level: row.level ?? '',
    character: row.character ?? '',
    location: row.location ?? '',
    prompt: row.prompt,
  };
}

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

function ensureUniqueNums(items: ScenePromptInput[], type: 'image' | 'video'): void {
  const seen = new Set<number>();
  for (const it of items) {
    if (seen.has(it.num)) {
      throw new HTTPException(400, { message: `duplicate ${type} prompt num: ${it.num}` });
    }
    seen.add(it.num);
  }
}

function loadScenePrompts(channelId: string): ScenePromptsDto {
  const rows = db.select().from(schema.scenePrompts)
    .where(eq(schema.scenePrompts.channelId, channelId))
    .orderBy(schema.scenePrompts.type, schema.scenePrompts.num)
    .all();
  const meta = db.select().from(schema.scenePromptsMeta)
    .where(eq(schema.scenePromptsMeta.channelId, channelId))
    .get();
  return {
    imagePrompts: rows.filter((r) => r.type === 'image').map(toDto),
    videoPrompts: rows.filter((r) => r.type === 'video').map(toDto),
    rawOutput: meta?.rawOutput ?? '',
  };
}

function upsertMeta(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  channelId: string,
  rawOutput: string,
): void {
  const existing = tx.select({ channelId: schema.scenePromptsMeta.channelId })
    .from(schema.scenePromptsMeta)
    .where(eq(schema.scenePromptsMeta.channelId, channelId))
    .get();
  if (existing) {
    tx.update(schema.scenePromptsMeta)
      .set({ rawOutput })
      .where(eq(schema.scenePromptsMeta.channelId, channelId))
      .run();
  } else {
    tx.insert(schema.scenePromptsMeta).values({ channelId, rawOutput }).run();
  }
}

export const scenePromptsRoute = new Hono();

scenePromptsRoute.get('/', (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  return c.json(loadScenePrompts(channelId));
});

scenePromptsRoute.put('/', validateJson(replaceScenePromptsSchema), (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  const input = getValidatedJson<typeof replaceScenePromptsSchema>(c) as ReplaceScenePromptsInput;
  ensureUniqueNums(input.imagePrompts, 'image');
  ensureUniqueNums(input.videoPrompts, 'video');
  db.transaction((tx) => {
    tx.delete(schema.scenePrompts).where(eq(schema.scenePrompts.channelId, channelId)).run();
    const rows = [
      ...input.imagePrompts.map((p) => ({
        channelId,
        type: 'image' as const,
        num: p.num,
        level: p.level,
        character: p.character,
        location: p.location,
        prompt: p.prompt,
      })),
      ...input.videoPrompts.map((p) => ({
        channelId,
        type: 'video' as const,
        num: p.num,
        level: p.level,
        character: p.character,
        location: p.location,
        prompt: p.prompt,
      })),
    ];
    if (rows.length > 0) {
      tx.insert(schema.scenePrompts).values(rows).run();
    }
    upsertMeta(tx, channelId, input.rawOutput);
  });
  return c.json(loadScenePrompts(channelId));
});

scenePromptsRoute.post('/append', validateJson(appendScenePromptsSchema), (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  const input = getValidatedJson<typeof appendScenePromptsSchema>(c) as AppendScenePromptsInput;
  ensureUniqueNums(input.imagePrompts, 'image');
  ensureUniqueNums(input.videoPrompts, 'video');
  db.transaction((tx) => {
    for (const p of input.imagePrompts) {
      const existing = tx.select({ id: schema.scenePrompts.id })
        .from(schema.scenePrompts)
        .where(and(
          eq(schema.scenePrompts.channelId, channelId),
          eq(schema.scenePrompts.type, 'image'),
          eq(schema.scenePrompts.num, p.num),
        ))
        .get();
      if (existing) {
        throw new HTTPException(409, { message: `image prompt num ${p.num} already exists` });
      }
    }
    for (const p of input.videoPrompts) {
      const existing = tx.select({ id: schema.scenePrompts.id })
        .from(schema.scenePrompts)
        .where(and(
          eq(schema.scenePrompts.channelId, channelId),
          eq(schema.scenePrompts.type, 'video'),
          eq(schema.scenePrompts.num, p.num),
        ))
        .get();
      if (existing) {
        throw new HTTPException(409, { message: `video prompt num ${p.num} already exists` });
      }
    }
    const rows = [
      ...input.imagePrompts.map((p) => ({
        channelId,
        type: 'image' as const,
        num: p.num,
        level: p.level,
        character: p.character,
        location: p.location,
        prompt: p.prompt,
      })),
      ...input.videoPrompts.map((p) => ({
        channelId,
        type: 'video' as const,
        num: p.num,
        level: p.level,
        character: p.character,
        location: p.location,
        prompt: p.prompt,
      })),
    ];
    if (rows.length > 0) {
      tx.insert(schema.scenePrompts).values(rows).run();
    }
    if (input.rawOutput) {
      const existingMeta = tx.select().from(schema.scenePromptsMeta)
        .where(eq(schema.scenePromptsMeta.channelId, channelId))
        .get();
      const combined = existingMeta?.rawOutput
        ? `${existingMeta.rawOutput}\n\n${input.rawOutput}`
        : input.rawOutput;
      upsertMeta(tx, channelId, combined);
    }
  });
  return c.json(loadScenePrompts(channelId));
});

scenePromptsRoute.delete('/', (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  db.transaction((tx) => {
    tx.delete(schema.scenePrompts).where(eq(schema.scenePrompts.channelId, channelId)).run();
    tx.delete(schema.scenePromptsMeta).where(eq(schema.scenePromptsMeta.channelId, channelId)).run();
  });
  return c.json({ deleted: true });
});
