import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { DB_PATH, ensureDataDirs } from '../services/filesystem.ts';
import * as schema from './schema.ts';

ensureDataDirs();

const sqlite = new Database(DB_PATH, { create: true });
sqlite.exec('PRAGMA foreign_keys = ON;');
sqlite.exec('PRAGMA journal_mode = WAL;');

export const db = drizzle(sqlite, { schema });
export { schema };
export type DB = typeof db;
