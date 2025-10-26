import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import cors from "cors";
import rateLimit from "express-rate-limit";

import { corsOptions } from "./middlewares/cors";
import { limiter } from "./middlewares/rateLimit";

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors(corsOptions));
app.use(limiter);
app.use(express.json());

// プロキシルート
app.use("/api", createProxyMiddleware({
  target: "https://example.com", // 変更可能
  changeOrigin: true,
  pathRewrite: { "^/api": "" }
}));

app.get("/", (_req, res) => {
  res.send("Proxy server is running!");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
