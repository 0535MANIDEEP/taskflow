/**
 * The Vercel entry point.
 *
 * It exports the Express app instead of listening on a port, because a
 * serverless function has to hand the app back to the platform. Everything
 * else about the app is the same object, built by the same `createApp()`.
 *
 * The schema is created once per cold start. Every request on a warm
 * instance skips it, because this module body only runs once per instance.
 */
import { createApp } from './app.js';
import { migrate } from './db/index.js';

await migrate();

export default createApp();
