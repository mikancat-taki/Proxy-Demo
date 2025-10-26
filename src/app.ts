import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import pinoHttp from 'pino-http';
import { proxyRouter, setupWebSocket } from './routes/proxy';
import { loggerMiddleware } from './middleware/logger';
import { securityMiddleware } from './middleware/security';
import { sriCspMiddleware } from './middleware/sri-csp';
import { setupPrometheus } from './middleware/prometheus';
import { limiter } from './middleware/rate-limit';

export function createApp(): Express {
  const app = express();

  // ミドルウェア
  app.use(cors());
  app.use(helmet());
  app.use(compression());
  app.use(pinoHttp());
  app.use(loggerMiddleware);
  app.use(securityMiddleware);
  app.use(sriCspMiddleware);
  app.use(limiter);

  // Prometheus
  setupPrometheus(app);

  // ルート
  app.use('/proxy', proxyRouter);

  return app;
}

export { setupWebSocket };
