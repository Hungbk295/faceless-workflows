import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { mkdir, stat, unlink } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { channelIdSchema } from 'shared';
import { db, schema } from '../db/client.ts';
import { attachmentPath, attachmentsDirForChannel } from '../services/filesystem.ts';

function parseChannelId(raw: string): string {
  const r = channelIdSchema.safeParse(raw);
  if (!r.success) throw new HTTPException(400, { message: 'invalid channel id' });
  return r.data;
}

function ensureChannelExists(channelId: string): void {
  const row = db.select({ id: schema.channels.id })
    .from(schema.channels).where(eq(schema.channels.id, channelId)).get();
  if (!row) throw new HTTPException(404, { message: 'channel not found' });
}

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB per file
const SAFE_FILENAME_RE = /^[a-zA-Z0-9._-]+$/;

function safeId(): string {
  return randomUUID().replace(/-/g, '');
}

export const attachmentsRoute = new Hono();

attachmentsRoute.post('/', async (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);

  const form = await c.req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    throw new HTTPException(400, { message: 'missing file' });
  }
  if (file.size > MAX_BYTES) {
    throw new HTTPException(413, { message: `file too large (max ${MAX_BYTES} bytes)` });
  }
  const ext = extname(file.name).toLowerCase().slice(0, 8) || '';
  const cleanExt = SAFE_FILENAME_RE.test(ext.slice(1)) ? ext : '';
  const fileId = `${safeId()}${cleanExt}`;
  const dir = attachmentsDirForChannel(channelId);
  await mkdir(dir, { recursive: true });
  const path = attachmentPath(channelId, fileId);
  await Bun.write(path, await file.arrayBuffer());
  return c.json({
    id: fileId,
    name: file.name,
    size: file.size,
    mimeType: file.type || 'application/octet-stream',
    url: `/api/channels/${channelId}/attachments/file/${encodeURIComponent(fileId)}`,
    path,
  });
});

attachmentsRoute.get('/file/:id', async (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  const id = c.req.param('id') ?? '';
  if (!SAFE_FILENAME_RE.test(id)) {
    throw new HTTPException(400, { message: 'invalid id' });
  }
  const path = attachmentPath(channelId, id);
  try {
    await stat(path);
  } catch {
    throw new HTTPException(404, { message: 'not found' });
  }
  const file = Bun.file(path);
  return new Response(file.stream(), {
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  });
});

attachmentsRoute.delete('/:id', async (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);
  const id = c.req.param('id') ?? '';
  if (!SAFE_FILENAME_RE.test(id)) {
    throw new HTTPException(400, { message: 'invalid id' });
  }
  const path = attachmentPath(channelId, id);
  try {
    await unlink(path);
    return c.json({ deleted: true });
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e?.code === 'ENOENT') return c.json({ deleted: false });
    throw err;
  }
});
