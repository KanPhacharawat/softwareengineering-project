import connectPgSimple from 'connect-pg-simple';
import session from 'express-session';
import { config } from './config.js';
import { pgPool } from './db.js';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

export const SESSION_COOKIE = 'cpms.sid';
const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
export const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: config.nodeEnv === 'production' } as const;

// Server-side session in PostgreSQL (SDS section 6, NFR-04). The `session` table is created by a Prisma
// migration, so the store must not create it.
export function sessionMiddleware() {
  const PgStore = connectPgSimple(session);
  return session({
    name: SESSION_COOKIE,
    secret: config.sessionSecret,
    store: new PgStore({ pool: pgPool, tableName: 'session', createTableIfMissing: false }),
    resave: false,
    saveUninitialized: false,
    rolling: true, // 8 hours of inactivity, renewed on each request
    cookie: { ...cookieOptions, maxAge: EIGHT_HOURS_MS },
  });
}
