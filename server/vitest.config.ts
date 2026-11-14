import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // The environment has to be set here rather than in a setup file. Setup
    // files run after their imports have been evaluated, and the database
    // module reads DB_DRIVER at import time to decide whether it opens a real
    // pool or an in-memory one. Set here, it is in place before any module in
    // the test graph is loaded.
    env: {
      NODE_ENV: 'test',
      DB_DRIVER: 'memory',
      JWT_SECRET: 'test-secret-this-never-reaches-production',
    },
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts'],
    // The forks pool times out spawning workers on Windows.
    pool: 'threads',
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
