import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { register, collectDefaultMetrics } from "prom-client";
import { createProxyRouter } from "./routes/proxy";
import { securityMiddleware } from "./middleware/security";
import { corsMiddleware } from "./middleware/cors";

collectDefaultMetrics();

export function createApp() {
  const app = express();

  // セキュリティ設定
  app.use(helmet());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(corsMiddleware);
  app.use(securityMiddleware);

  // ログ設定
  app.use(pinoHttp({ level: process.env.LOG_LEVEL || "info" }));

  // Prometheus メトリクス
  app.get("/metrics", async (req, res) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  });

  // ルート登録
  app.use("/proxy", createProxyRouter());

  // ヘルスチェック
  app.get("/health", (req, res) => res.json({ status: "ok" }));

  return app;
}
