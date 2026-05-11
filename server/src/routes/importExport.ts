import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { stat } from 'node:fs/promises';
import { importFromJson, exportToJson } from '../services/import.ts';
import { DB_PATH } from '../services/filesystem.ts';

export const importRoute = new Hono();
export const exportRoute = new Hono();

importRoute.post('/', async (c) => {
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    throw new HTTPException(400, { message: 'invalid JSON body' });
  }
  try {
    const result = await importFromJson(payload);
    return c.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new HTTPException(400, { message });
  }
});

exportRoute.post('/', (c) => c.json(exportToJson()));
exportRoute.get('/', (c) => c.json(exportToJson()));

exportRoute.get('/db', async (_c) => {
  const file = Bun.file(DB_PATH);
  if (!(await file.exists())) {
    throw new HTTPException(404, { message: 'database file not found' });
  }
  let size = 0;
  try { size = (await stat(DB_PATH)).size; } catch { /* leave 0 */ }
  return new Response(file, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="faceless.db"',
      ...(size > 0 ? { 'Content-Length': String(size) } : {}),
    },
  });
});
