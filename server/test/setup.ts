import { beforeAll } from 'vitest';

import { migrate } from '../src/db/index.js';

/**
 * The schema is created once per test file, before any test runs.
 *
 * Each test file gets its own in-memory Postgres, because the module graph is
 * rebuilt per file. That means a test file cannot see another file's rows,
 * which is why every test that needs an account creates one.
 */
beforeAll(async () => {
  await migrate();
});
