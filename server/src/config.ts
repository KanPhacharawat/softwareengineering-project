// All configuration comes from environment variables (NFR-08). See .env.example and
// docs/labs/lab-05/deployment.md for the full list.
import { fileURLToPath } from 'node:url';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
const sessionSecret = required('SESSION_SECRET');
if (nodeEnv === 'production' && sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET must be at least 32 characters in production');
}

export const config = {
  // Cloud Run sets PORT (8080). Default 3000 for local dev, where Vite proxies /api to it.
  port: Number(process.env.PORT ?? 3000),
  nodeEnv,
  databaseUrl: required('DATABASE_URL'),
  sessionSecret,
  // Built React app (npm run build -w web). Served by Express in production so UI and API share one container.
  webDistDir: fileURLToPath(new URL('../../web/dist', import.meta.url)),
};
