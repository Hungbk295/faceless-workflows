import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { eq, and } from 'drizzle-orm';
import {
  channelIdSchema,
  updateVisualPromptsSchema,
  type VisualPromptsDto,
  type UpdateVisualPromptsInput,
  type VisualPromptKey,
} from 'shared';
import { db, schema } from '../db/client.ts';
import { validateJson, getValidatedJson } from '../middleware/validate.ts';

const KEYS: VisualPromptKey[] = ['charStyle', 'bgStyle', 'sceneStyle', 'styleRef'];

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

function loadVisualPrompts(channelId: string): VisualPromptsDto {
  const rows = db.select().from(schema.visualPrompts)
    .where(eq(schema.visualPrompts.channelId, channelId))
    .all();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return {
    charStyle: map.charStyle ?? '',
    bgStyle: map.bgStyle ?? '',
    sceneStyle: map.sceneStyle ?? '',
    styleRef: map.styleRef ?? '',
  };
}

export const visualPromptsRoute = new Hono();

visualPromptsRoute.get('/', (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  return c.json(loadVisualPrompts(channelId));
});

visualPromptsRoute.on(['PATCH', 'PUT'], '/', validateJson(updateVisualPromptsSchema), (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  const patch = getValidatedJson<typeof updateVisualPromptsSchema>(c) as UpdateVisualPromptsInput;
  db.transaction((tx) => {
    for (const key of KEYS) {
      const value = patch[key];
      if (value === undefined) continue;
      const existing = tx.select().from(schema.visualPrompts)
        .where(and(
          eq(schema.visualPrompts.channelId, channelId),
          eq(schema.visualPrompts.key, key),
        ))
        .get();
      if (existing) {
        tx.update(schema.visualPrompts)
          .set({ value })
          .where(and(
            eq(schema.visualPrompts.channelId, channelId),
            eq(schema.visualPrompts.key, key),
          ))
          .run();
      } else {
        tx.insert(schema.visualPrompts).values({ channelId, key, value }).run();
      }
    }
  });
  return c.json(loadVisualPrompts(channelId));
});
