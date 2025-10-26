import express, { Express } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import helmet from 'helmet';
import compression from 'compression';
import pinoHttp from 'pino-http';
import { proxyRouter } from './routes/proxy';
import { setupPrometheus } from './middleware/prometheus';
import { loggerMiddleware } from './middleware/logger';
import { corsWhitelist } from './middleware/cors-whitelist';
import { securityMiddleware } from './middleware/security';

export function createApp(): Express {
  const app = express();

  // Redis クライアント
  const redisClient = createClient();
  redisClient.connect().catch(console.error);

  // ミドルウェア
  app.use(cors(corsWhitelist));
  app.use(helmet());
  app.use(compression());
  app.use(pinoHttp());
  app.use(loggerMiddleware);
  app.use(securityMiddleware);

  // レート制限
  const limiter = rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }),
    windowMs: 60 * 1000,
    max: 60,
  });
  app.use(limiter);

  // Prometheus
  setupPrometheus(app);

  // ルート
  app.use('/proxy', proxyRouter);

  return app;
}
