import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { errorMiddleware } from './middleware/error.ts';
import { healthRoute } from './routes/health.ts';
import { channelsRoute } from './routes/channels.ts';
import { scriptsRoute } from './routes/scripts.ts';
import { scenesRoute } from './routes/scenes.ts';
import { inventoryRoute } from './routes/inventory.ts';
import { scenePromptsRoute } from './routes/scenePrompts.ts';
import { voiceConfigRoute } from './routes/voiceConfig.ts';
import { visualPromptsRoute } from './routes/visualPrompts.ts';
import { settingsRoute } from './routes/settings.ts';
import { referenceRoute } from './routes/reference.ts';
import { formDraftsRoute } from './routes/formDrafts.ts';
import { clipsRoute, voiceRoute } from './routes/clips.ts';
import { claudeRoute } from './routes/claude.ts';
import { importRoute, exportRoute } from './routes/importExport.ts';
import { spyRoute } from './routes/spy.ts';
import { attachmentsRoute } from './routes/attachments.ts';

export const app = new Hono();

app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:5177', 'http://127.0.0.1:5177'],
  credentials: true,
}));
app.use('*', errorMiddleware);

app.route('/api/health', healthRoute);
app.route('/api/channels', channelsRoute);
app.route('/api/channels/:channelId/scripts', scriptsRoute);
app.route('/api/channels/:channelId/scenes', scenesRoute);
app.route('/api/channels/:channelId/inventory', inventoryRoute);
app.route('/api/channels/:channelId/scene-prompts', scenePromptsRoute);
app.route('/api/channels/:channelId/voice-config', voiceConfigRoute);
app.route('/api/channels/:channelId/visual-prompts', visualPromptsRoute);
app.route('/api/channels/:channelId/reference', referenceRoute);
app.route('/api/channels/:channelId/spy', spyRoute);
app.route('/api/channels/:channelId/attachments', attachmentsRoute);
app.route('/api/channels/:channelId/form-drafts', formDraftsRoute);
app.route('/api/channels/:channelId/clips', clipsRoute);
app.route('/api/channels/:channelId/voice', voiceRoute);
app.route('/api/claude', claudeRoute);
app.route('/api/import', importRoute);
app.route('/api/export', exportRoute);
app.route('/api/settings', settingsRoute);

app.notFound((c) => c.json({ error: 'Not Found', path: c.req.path }, 404));
