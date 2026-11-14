/**
 * The Express application.
 *
 * It is built and exported separately from the server that listens on it,
 * because the test suite imports this and drives it with supertest. Nothing
 * here opens a port.
 */
import cors from 'cors';
import express, { type Express } from 'express';

import { config } from './config.js';
import db from './db/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import taskRoutes from './routes/taskRoutes.js';

export function createApp(): Express {
  const app = express();

  // A JSON body larger than this is not a real request from this app.
  app.use(express.json({ limit: '32kb' }));

  // The API and the front end are served from one process in production, so
  // this only does anything during development.
  app.use(cors({ origin: config.corsOrigin }));

  /**
   * A health check that does not touch the database cannot tell you whether
   * the database is reachable, which is usually the thing that has actually
   * broken.
   */
  app.get('/api/health', async (_req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ status: 'ok', database: 'ok' });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'unreachable' });
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/tasks', taskRoutes);

  // Any other /api path is a request this server does not know how to answer.
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'No such endpoint' });
  });

  // Four arguments means Express treats this as error middleware. Express 5
  // also forwards rejected promises from async handlers here on its own,
  // which is why none of the route handlers need try/catch.
  app.use(errorHandler);

  return app;
}

export default createApp;
