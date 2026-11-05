import express, { type ErrorRequestHandler } from 'express';
import type { PrismaClient } from '@prisma/client';
import { AppError } from './lib/errors.js';

export type AppOptions = {
  prisma: PrismaClient;
  sessionSecret: string;
  now?: () => Date;
};

export function createApp(_opts: AppOptions) {
  const app = express();
  app.use(express.json());

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: { code: err.code, message: err.message, ...(err.fields && { fields: err.fields }) } });
      return;
    }
    console.error(err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  };
  app.use(errorHandler);
  return app;
}
