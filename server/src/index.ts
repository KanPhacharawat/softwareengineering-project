import { createApp } from './app.js';
import { config } from './config.js';
import { pgPool, prisma } from './db.js';

const server = createApp().listen(config.port, config.host, () => {
  console.log(`CPMS listening on ${config.host}:${config.port} (${config.nodeEnv})`);
});

// Cloud Run sends SIGTERM before stopping an instance: finish in-flight requests, then close DB connections.
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down');
  server.close(async () => {
    await Promise.allSettled([prisma.$disconnect(), pgPool.end()]);
    process.exit(0);
  });
});
