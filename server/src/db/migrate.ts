/** Applies db/migrations/*.sql in order. Safe to run repeatedly. */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { log } from '../logging.ts';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../db/migrations');
const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) throw new Error('DATABASE_URL is not set');

const client = new pg.Client({
  connectionString,
  ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: false },
});
await client.connect();
for (const file of (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()) {
  await client.query(await readFile(path.join(dir, file), 'utf8'));
  log.info('migration applied', { file });
}
await client.end();
