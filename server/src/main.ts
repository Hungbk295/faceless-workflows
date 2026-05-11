import { app } from './app.ts';

const port = Number(process.env.PORT ?? 3007);

console.log(`[faceless-studio] server starting on :${port}`);

export default {
  port,
  fetch: app.fetch,
};
