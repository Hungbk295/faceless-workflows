import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { eq, and } from 'drizzle-orm';
import {
  channelIdSchema,
  formKeySchema,
  upsertFormDraftSchema,
  type FormDraftDto,
  type FormKey,
  type UpsertFormDraftInput,
} from 'shared';
import { db, schema } from '../db/client.ts';
import { validateJson, getValidatedJson } from '../middleware/validate.ts';

function parseChannelId(raw: string): string {
  const result = channelIdSchema.safeParse(raw);
  if (!result.success) {
    throw new HTTPException(400, { message: 'invalid channel id' });
  }
  return result.data;
}

function parseFormKey(raw: string): FormKey {
  const result = formKeySchema.safeParse(raw);
  if (!result.success) {
    throw new HTTPException(400, { message: 'invalid form key' });
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

function toDto(channelId: string, formKey: FormKey, data: unknown): FormDraftDto {
  return { channelId, formKey, data };
}

export const formDraftsRoute = new Hono();

formDraftsRoute.get('/:formKey', (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  const formKey = parseFormKey(c.req.param('formKey') ?? '');
  ensureChannelExists(channelId);
  const row = db.select().from(schema.formDrafts)
    .where(and(
      eq(schema.formDrafts.channelId, channelId),
      eq(schema.formDrafts.formKey, formKey),
    ))
    .get();
  if (!row) return c.json(toDto(channelId, formKey, null));
  let parsed: unknown = null;
  try { parsed = JSON.parse(row.data); } catch { parsed = null; }
  return c.json(toDto(channelId, formKey, parsed));
});

formDraftsRoute.on(['PATCH', 'PUT'], '/:formKey', validateJson(upsertFormDraftSchema), (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  const formKey = parseFormKey(c.req.param('formKey') ?? '');
  ensureChannelExists(channelId);
  const { data } = getValidatedJson<typeof upsertFormDraftSchema>(c) as UpsertFormDraftInput;
  const json = JSON.stringify(data ?? null);
  db.transaction((tx) => {
    const existing = tx.select({ formKey: schema.formDrafts.formKey })
      .from(schema.formDrafts)
      .where(and(
        eq(schema.formDrafts.channelId, channelId),
        eq(schema.formDrafts.formKey, formKey),
      ))
      .get();
    if (existing) {
      tx.update(schema.formDrafts)
        .set({ data: json })
        .where(and(
          eq(schema.formDrafts.channelId, channelId),
          eq(schema.formDrafts.formKey, formKey),
        ))
        .run();
    } else {
      tx.insert(schema.formDrafts).values({ channelId, formKey, data: json }).run();
    }
  });
  return c.json(toDto(channelId, formKey, data));
});

formDraftsRoute.delete('/:formKey', (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  const formKey = parseFormKey(c.req.param('formKey') ?? '');
  const deleted = db.delete(schema.formDrafts)
    .where(and(
      eq(schema.formDrafts.channelId, channelId),
      eq(schema.formDrafts.formKey, formKey),
    ))
    .returning()
    .get();
  if (!deleted) throw new HTTPException(404, { message: 'form draft not found' });
  return c.json({ formKey: deleted.formKey, deleted: true });
});
