import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { eq } from 'drizzle-orm';
import {
  channelIdSchema,
  replaceInventorySchema,
  type InventoryDto,
  type InventoryItemDto,
  type ReplaceInventoryInput,
  type InventoryItemInput,
} from 'shared';
import { db, schema } from '../db/client.ts';
import { validateJson, getValidatedJson } from '../middleware/validate.ts';

type ItemRow = typeof schema.inventoryItems.$inferSelect;

function toItemDto(row: ItemRow): InventoryItemDto {
  return {
    refId: row.refId,
    label: row.label ?? '',
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

function loadInventory(channelId: string): InventoryDto {
  const items = db.select().from(schema.inventoryItems)
    .where(eq(schema.inventoryItems.channelId, channelId))
    .orderBy(schema.inventoryItems.type, schema.inventoryItems.refId)
    .all();
  const meta = db.select().from(schema.inventoryMeta)
    .where(eq(schema.inventoryMeta.channelId, channelId))
    .get();
  return {
    characters: items.filter((i) => i.type === 'character').map(toItemDto),
    locations: items.filter((i) => i.type === 'location').map(toItemDto),
    rawOutput: meta?.rawOutput ?? '',
  };
}

function ensureUniqueRefIds(items: InventoryItemInput[], type: 'character' | 'location'): void {
  const seen = new Set<string>();
  for (const it of items) {
    if (seen.has(it.refId)) {
      throw new HTTPException(400, { message: `duplicate ${type} refId: ${it.refId}` });
    }
    seen.add(it.refId);
  }
}

export const inventoryRoute = new Hono();

inventoryRoute.get('/', (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  return c.json(loadInventory(channelId));
});

inventoryRoute.put('/', validateJson(replaceInventorySchema), (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  const input = getValidatedJson<typeof replaceInventorySchema>(c) as ReplaceInventoryInput;
  ensureUniqueRefIds(input.characters, 'character');
  ensureUniqueRefIds(input.locations, 'location');
  db.transaction((tx) => {
    tx.delete(schema.inventoryItems).where(eq(schema.inventoryItems.channelId, channelId)).run();
    const rows = [
      ...input.characters.map((i) => ({
        channelId,
        type: 'character' as const,
        refId: i.refId,
        label: i.label,
        prompt: i.prompt,
      })),
      ...input.locations.map((i) => ({
        channelId,
        type: 'location' as const,
        refId: i.refId,
        label: i.label,
        prompt: i.prompt,
      })),
    ];
    if (rows.length > 0) {
      tx.insert(schema.inventoryItems).values(rows).run();
    }
    const existingMeta = tx.select({ channelId: schema.inventoryMeta.channelId })
      .from(schema.inventoryMeta)
      .where(eq(schema.inventoryMeta.channelId, channelId))
      .get();
    if (existingMeta) {
      tx.update(schema.inventoryMeta)
        .set({ rawOutput: input.rawOutput })
        .where(eq(schema.inventoryMeta.channelId, channelId))
        .run();
    } else {
      tx.insert(schema.inventoryMeta).values({ channelId, rawOutput: input.rawOutput }).run();
    }
  });
  return c.json(loadInventory(channelId));
});

inventoryRoute.delete('/', (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  db.transaction((tx) => {
    tx.delete(schema.inventoryItems).where(eq(schema.inventoryItems.channelId, channelId)).run();
    tx.delete(schema.inventoryMeta).where(eq(schema.inventoryMeta.channelId, channelId)).run();
  });
  return c.json({ deleted: true });
});

