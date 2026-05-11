import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { eq } from 'drizzle-orm';
import {
  channelIdSchema,
  updateReferenceSchema,
  type ReferenceDto,
  type UpdateReferenceInput,
} from 'shared';
import { db, schema } from '../db/client.ts';
import { nowIso } from '../lib/id.ts';
import { validateJson, getValidatedJson } from '../middleware/validate.ts';

function parseChannelId(raw: string): string {
  const result = channelIdSchema.safeParse(raw);
  if (!result.success) {
    throw new HTTPException(400, { message: 'invalid channel id' });
  }
  return result.data;
}

function loadReference(channelId: string): ReferenceDto {
  const row = db.select({
    refUrl: schema.channels.refUrl,
    refNotes: schema.channels.refNotes,
    refAnalysis: schema.channels.refAnalysis,
  }).from(schema.channels).where(eq(schema.channels.id, channelId)).get();
  if (!row) throw new HTTPException(404, { message: 'channel not found' });
  return {
    refUrl: row.refUrl ?? '',
    refNotes: row.refNotes ?? '',
    refAnalysis: row.refAnalysis ?? '',
  };
}

export const referenceRoute = new Hono();

referenceRoute.get('/', (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  return c.json(loadReference(channelId));
});

referenceRoute.on(['PATCH', 'PUT'], '/', validateJson(updateReferenceSchema), (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  const patch = getValidatedJson<typeof updateReferenceSchema>(c) as UpdateReferenceInput;
  if (Object.keys(patch).length === 0) {
    throw new HTTPException(400, { message: 'empty update' });
  }
  const updated = db.update(schema.channels)
    .set({ ...patch, updatedAt: nowIso() })
    .where(eq(schema.channels.id, channelId))
    .returning()
    .get();
  if (!updated) throw new HTTPException(404, { message: 'channel not found' });
  return c.json({
    refUrl: updated.refUrl ?? '',
    refNotes: updated.refNotes ?? '',
    refAnalysis: updated.refAnalysis ?? '',
  });
});
