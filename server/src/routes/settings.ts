import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { eq } from 'drizzle-orm';
import {
  updateSettingsSchema,
  type SettingsDto,
  type UpdateSettingsInput,
} from 'shared';
import { db, schema } from '../db/client.ts';
import { validateJson, getValidatedJson } from '../middleware/validate.ts';

function loadAll(): SettingsDto {
  const rows = db.select().from(schema.settings).all();
  const out: SettingsDto = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export const settingsRoute = new Hono();

settingsRoute.get('/', (_c) => {
  return _c.json(loadAll());
});

settingsRoute.get('/:key', (c) => {
  const key = c.req.param('key');
  if (!key) throw new HTTPException(400, { message: 'missing key' });
  const row = db.select().from(schema.settings).where(eq(schema.settings.key, key)).get();
  if (!row) throw new HTTPException(404, { message: 'setting not found' });
  return c.json({ key: row.key, value: row.value });
});

settingsRoute.on(['PATCH', 'PUT'], '/', validateJson(updateSettingsSchema), (c) => {
  const patch = getValidatedJson<typeof updateSettingsSchema>(c) as UpdateSettingsInput;
  db.transaction((tx) => {
    for (const [key, value] of Object.entries(patch)) {
      const existing = tx.select({ key: schema.settings.key })
        .from(schema.settings)
        .where(eq(schema.settings.key, key))
        .get();
      if (existing) {
        tx.update(schema.settings)
          .set({ value })
          .where(eq(schema.settings.key, key))
          .run();
      } else {
        tx.insert(schema.settings).values({ key, value }).run();
      }
    }
  });
  return c.json(loadAll());
});

settingsRoute.delete('/:key', (c) => {
  const key = c.req.param('key');
  if (!key) throw new HTTPException(400, { message: 'missing key' });
  const deleted = db.delete(schema.settings).where(eq(schema.settings.key, key)).returning().get();
  if (!deleted) throw new HTTPException(404, { message: 'setting not found' });
  return c.json({ key: deleted.key, deleted: true });
});
