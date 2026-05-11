import { defineConfig } from 'drizzle-kit';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

const DATA_DIR = join(homedir(), '.faceless-studio');
const DB_PATH = join(DATA_DIR, 'faceless.db');

mkdirSync(DATA_DIR, { recursive: true });

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url: DB_PATH,
  },
  verbose: true,
  strict: true,
});
