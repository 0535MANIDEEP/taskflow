/**
 * The database connection.
 *
 * Postgres, not SQLite, and the reason is deployment. SQLite needs no
 * installation and that is still true of it locally, but a hosted API has an
 * ephemeral filesystem and a local SQLite file is lost every time the service
 * restarts or spins down. A task manager that loses every row when the server
 * idles for a few minutes is not a task manager.
 *
 * TWO DRIVERS, ONE SET OF SQL
 *
 *   normal   a real Postgres pool, via DATABASE_URL
 *   memory   pg-mem, an in-memory Postgres, used by the test suite
 *
 * The reason for the second is that the tests have to run with one command
 * and no database installed. Every statement the app runs is standard SQL and
 * runs unchanged against either, so the suite exercises the same queries the
 * app runs in production.
 */
import pg from 'pg';

import { config } from '../config.js';
import { SCHEMA } from './schema.js';

const useMemory = process.env.DB_DRIVER === 'memory';

let pool: pg.Pool;

if (useMemory) {
  const { newDb } = await import('pg-mem');
  const memory = newDb();
  const adapter = memory.adapters.createPg();
  // One connection only. The in-memory database lives inside the pool, and a
  // second connection would see a second empty database. A request that
  // arrives while another is in flight has to wait for this one rather than
  // opening another and finding nothing there.
  pool = new adapter.Pool({ max: 1 }) as unknown as pg.Pool;
} else {
  if (!config.databaseUrl) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env and point it at a Postgres database.',
    );
  }
  pool = new pg.Pool({
    connectionString: config.databaseUrl,
    // A pool opens connections lazily and reuses them. Without a cap a burst
    // of traffic can open more connections than Postgres is configured to
    // allow, and the new ones are then refused.
    max: 10,
  });
}

/**
 * Creates the tables if they are not there already.
 *
 * CREATE TABLE IF NOT EXISTS is a no-op when the table exists, so this is
 * safe to call on every start. The schema runs before the server begins
 * listening, so the first request cannot arrive at a database with no tables
 * in it.
 */
export async function migrate(): Promise<void> {
  await pool.query(SCHEMA);
}

export async function close(): Promise<void> {
  await pool.end();
}

export default pool;
