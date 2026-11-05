import express, { type ErrorRequestHandler } from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';
import path from 'node:path';
import fs from 'node:fs';
import type { PrismaClient } from '@prisma/client';
import { AppError, notFound } from './lib/errors.js';
import { requireAuth } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';
import { teamsRouter } from './routes/teams.js';

export type AppOptions = {
  prisma: PrismaClient;
  sessionSecret: string;
  /** Injected clock for deadline rules; defaults to server time. */
  now?: () => Date;
  databaseUrl?: string;
  /** Directory of the built web app to serve in production. */
  webDist?: string;
};

const EIGHT_HOURS = 8 * 60 * 60 * 1000;

export function createApp(opts: AppOptions) {
  const { prisma } = opts;
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '100kb' }));

  const PgStore = connectPgSimple(session);
  const pool = new pg.Pool({ connectionString: opts.databaseUrl ?? process.env.DATABASE_URL });
  app.use(
    session({
      name: 'cpms.sid',
      secret: opts.sessionSecret,
      store: new PgStore({ pool, tableName: 'session', createTableIfMissing: false }),
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: EIGHT_HOURS,
      },
    }),
  );

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api/auth', authRouter(prisma));
  app.use('/api', requireAuth(prisma));
  app.use('/api/teams', teamsRouter(prisma));
  app.use('/api', (_req, _res, next) => next(notFound()));

  if (opts.webDist && fs.existsSync(opts.webDist)) {
    app.use(express.static(opts.webDist));
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(opts.webDist!, 'index.html')));
  }

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: { code: err.code, message: err.message, ...(err.fields && { fields: err.fields }) } });
      return;
    }
    if (err?.type === 'entity.parse.failed') {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON body' } });
      return;
    }
    console.error(err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  };
  app.use(errorHandler);
  return app;
}
