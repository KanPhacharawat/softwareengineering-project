import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { createApp } from './app.js';

const secret = process.env.SESSION_SECRET;
if (!secret) throw new Error('SESSION_SECRET is required');

const here = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();
const app = createApp({ prisma, sessionSecret: secret, webDist: path.resolve(here, '../../web/dist') });
const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`CPMS API listening on http://localhost:${port}`));
