// All configuration comes from environment variables (NFR-08). See .env.example.
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
  port: Number(process.env.PORT ?? 3000),
  nodeEnv,
  databaseUrl: required('DATABASE_URL'),
  sessionSecret,
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
};
