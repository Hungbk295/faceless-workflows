import type { Context, MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ZodSchema, z } from 'zod';

const VALIDATED = Symbol('validated');

export function validateJson<S extends ZodSchema>(schema: S): MiddlewareHandler {
  return async (c, next) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new HTTPException(400, { message: 'invalid JSON body' });
    }
    const result = schema.safeParse(body);
    if (!result.success) {
      const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new HTTPException(400, { message: `validation failed: ${issues}` });
    }
    const store = (c.get(VALIDATED as never) as Record<string, unknown> | undefined) ?? {};
    store.json = result.data;
    c.set(VALIDATED as never, store as never);
    await next();
  };
}

export function getValidatedJson<S extends ZodSchema>(c: Context): z.infer<S> {
  const store = c.get(VALIDATED as never) as { json?: unknown } | undefined;
  if (!store || store.json === undefined) {
    throw new Error('getValidatedJson called without validateJson middleware');
  }
  return store.json as z.infer<S>;
}
