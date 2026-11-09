import express from 'express';
import { errorHandler, notFoundHandler } from './errors.js';
import { requireAuth } from './middleware/require-auth.js';
import { authRouter } from './routes/auth.js';
import { milestonesRouter } from './routes/milestones.js';
import { submissionsRouter } from './routes/submissions.js';
import { teamsRouter } from './routes/teams.js';
import { sessionMiddleware } from './session.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Cloud Run terminates TLS; needed for Secure cookies in production.
  app.use(express.json());

  // Public routes
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
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
  app.use(errorHandler);
  return app;
}
