import { Hono } from 'hono';
import { claudeRunSchema, type ClaudeRunInput } from 'shared';
import { validateJson, getValidatedJson } from '../middleware/validate.ts';
import { runClaude } from '../services/claudeBridge.ts';

export const claudeRoute = new Hono();

claudeRoute.post('/run', validateJson(claudeRunSchema), async (c) => {
  const { prompt, sessionId } = getValidatedJson<typeof claudeRunSchema>(c) as ClaudeRunInput;

  const controller = new AbortController();
  c.req.raw.signal.addEventListener('abort', () => controller.abort());

  try {
    const result = await runClaude({ prompt, sessionId, signal: controller.signal });
    return c.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});
