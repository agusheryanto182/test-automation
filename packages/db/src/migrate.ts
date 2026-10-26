import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createDb, type Db } from './client.js';

export const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));

export function runMigrations(db: Db) {
  return migrate(db, { migrationsFolder });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const { db, sql } = createDb(url);
  await runMigrations(db);
  await sql.end();
}
