import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { config } from './config.js';

export const prisma = new PrismaClient();

// Plain pg pool used only by the session store (connect-pg-simple), on the same database as Prisma.
export const pgPool = new pg.Pool({ connectionString: config.databaseUrl });
