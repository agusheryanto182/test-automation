import { createDb } from './client.js';

export * from './schema.js';
export { createDb, type Db } from './client.js';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');

export const { db, sql } = createDb(url);
