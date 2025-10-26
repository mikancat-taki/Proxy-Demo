import express, { Request, Response } from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import compression from "compression";

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// テスト用ルート
app.get("/", (_req: Request, res: Response) => {
  res.send("Proxy server is running!");
});

// プロキシ設定例
app.use(
  "/api",
  createProxyMiddleware({
    target: "https://example.com", // 実際にプロキシしたいURLに変更
    changeOrigin: true,
    pathRewrite: {
      "^/api": "",
    },
  })
);

// サーバー起動
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
