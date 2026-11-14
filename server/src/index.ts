/**
 * The server entry point.
 *
 * Environment variables are loaded by Node itself, from the --env-file flag in
 * the npm scripts. There is no dotenv import here, which is the modern way:
 * the flag has been stable in Node since v20.6 and removes a dependency
 * entirely.
 */
import { createApp } from './app.js';
import { config } from './config.js';
import { close, migrate } from './db/index.js';

const app = createApp();

// The schema runs before the server starts listening, so the first request
// cannot arrive at a database with no tables in it.
await migrate();

const server = app.listen(config.port, () => {
  console.log(`taskflow api listening on http://localhost:${config.port}`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    void close().finally(() => process.exit(0));
  });
});
