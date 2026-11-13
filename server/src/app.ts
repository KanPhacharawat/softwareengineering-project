import { existsSync } from 'node:fs';
import path from 'node:path';
import express from 'express';
import { config } from './config.js';
import { prisma } from './db.js';
import { errorHandler, notFoundHandler } from './errors.js';
import { requireAuth } from './middleware/require-auth.js';
import { authRouter } from './routes/auth.js';
import { milestonesRouter } from './routes/milestones.js';
import { submissionsRouter } from './routes/submissions.js';
import { teamsRouter } from './routes/teams.js';
import { sessionMiddleware } from './session.js';

export type AppOptions = {
  // Throws when the database cannot be reached. Injectable so tests can simulate an outage.
  checkDatabase?: () => Promise<unknown>;
  // Folder with the built React app; served only when it exists (production image).
  webDistDir?: string;
};

const pingDatabase = () => prisma.$queryRaw`SELECT 1`;

export function createApp({ checkDatabase = pingDatabase, webDistDir = config.webDistDir }: AppOptions = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Cloud Run terminates TLS; needed for Secure cookies in production.
  app.use(express.json());

  // Public routes
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Readiness: 200 only when PostgreSQL answers, 503 otherwise (used by the deploy smoke test).
  app.get('/api/ready', async (_req, res) => {
    try {
      await checkDatabase();
      res.json({ ok: true, database: 'up' });
    } catch {
      res.status(503).json({ ok: false, database: 'down' });
    }
  });

  app.use('/api', sessionMiddleware());
  app.use('/api/auth', authRouter);

  // Everything else under /api needs a session (AC-03, NFR-02). Unknown paths still answer 401 before 404,
  // so an anonymous caller learns nothing about which routes or records exist.
  app.use('/api', requireAuth);
  // Feature routers. Role checks (requireRole) and team scope checks (loadTeamInScope) live inside them.
  app.use('/api/teams', teamsRouter);
  app.use('/api/milestones', milestonesRouter);
  app.use('/api/submissions', submissionsRouter);

  app.use('/api', notFoundHandler);

  // Production: one container serves the React app too. Unknown non-API GETs get index.html so
  // client-side routes (e.g. /teams/123) work on reload.
  if (existsSync(path.join(webDistDir, 'index.html'))) {
    app.use(express.static(webDistDir, { index: false }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      res.sendFile(path.join(webDistDir, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
