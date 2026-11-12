import { createApp } from './app.js';
import { config } from './config.js';

// 0.0.0.0, not localhost: the container port must be reachable from outside (Cloud Run).
createApp().listen(config.port, '0.0.0.0', () => {
  console.log(`CPMS listening on 0.0.0.0:${config.port} (${config.nodeEnv})`);
});
