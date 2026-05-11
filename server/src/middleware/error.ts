import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';

export const errorMiddleware: MiddlewareHandler = async (c, next) => {
  try {
    await next();
  } catch (err) {
    if (err instanceof HTTPException) {
      return c.json({ error: err.message }, err.status);
    }
    console.error('[error]', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return c.json({ error: message }, 500);
  }
};
