import { Hono } from 'hono';

export const healthRoute = new Hono();

healthRoute.get('/', (c) => c.json({
  status: 'ok',
  version: '0.1.0',
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
}));
