import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { mkdir, stat, unlink, copyFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';
import { homedir } from 'node:os';
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

function selectFolderDialog(): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('osascript', [
      '-e',
      'POSIX path of (choose folder with prompt "Chọn thư mục để lưu ảnh:")'
    ]);
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr.trim() || `AppleScript exited with code ${code}`));
      }
    });
  });
}

attachmentsRoute.post('/save-to-folder', async (c) => {
  const channelId = parseChannelId(c.req.param('channelId') ?? '');
  ensureChannelExists(channelId);

  const { targetFolder, items } = (await c.req.json()) as { targetFolder?: string; items: any[] };
  if (!items || !Array.isArray(items)) {
    throw new HTTPException(400, { message: 'invalid items' });
  }

  let folderPath = '';
  if (targetFolder && typeof targetFolder === 'string' && targetFolder.trim()) {
    folderPath = targetFolder.trim();
    if (folderPath.startsWith('~')) {
      folderPath = join(homedir(), folderPath.slice(1));
    }
  } else {
    // Open macOS native Directory Picker dialog via AppleScript
    try {
      folderPath = await selectFolderDialog();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('User canceled') || errMsg.includes('User cancelled')) {
        return c.json({ success: true, cancelled: true, copiedCount: 0 });
      }
      throw new HTTPException(500, { message: `Lỗi mở hộp thoại chọn thư mục: ${errMsg}` });
    }
  }

  try {
    await mkdir(folderPath, { recursive: true });
  } catch (err) {
    throw new HTTPException(500, { message: `Không thể tạo thư mục: ${err instanceof Error ? err.message : String(err)}` });
  }

  let copiedCount = 0;
  const errors: string[] = [];

  for (const item of items) {
    const sourcePath = item.serverPath;
    if (!sourcePath) {
      continue;
    }

    // Determine target filename
    let filename = item.label || 'image.jpg';
    if (item.kind === 'frame') {
      filename = sourcePath.split(/[/\\]/).pop() || `${item.id.replace(/:/g, '_')}.jpg`;
    } else if (item.kind === 'video') {
      filename = sourcePath.split(/[/\\]/).pop() || 'thumbnail.jpg';
    }

    // Ensure safe filename by removing illegal path characters
    filename = filename.replace(/[/\\]/g, '_');

    const destPath = join(folderPath, filename);

    try {
      await stat(sourcePath);
      await copyFile(sourcePath, destPath);
      copiedCount++;
    } catch (err) {
      console.error(`[save-to-folder] Failed to copy ${sourcePath} to ${destPath}:`, err);
      errors.push(`${filename}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return c.json({
    success: true,
    copiedCount,
    folder: folderPath,
    errors: errors.length > 0 ? errors : undefined,
  });
});


