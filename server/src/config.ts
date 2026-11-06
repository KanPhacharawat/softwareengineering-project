// All configuration comes from environment variables (NFR-08). See .env.example.
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: required('DATABASE_URL'),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
};
