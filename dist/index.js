const express = require("express");
const cors = require("cors");
const compression = require("compression");
const { createProxyMiddleware } = require("http-proxy-middleware");
const WebSocket = require("ws");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// テスト用ルート
app.get("/", (req, res) => {
  res.send("Proxy server is running!");
});

// HTTP プロキシルート
app.use("/api", createProxyMiddleware({
  target: "https://example.com", // 実際にプロキシしたいURLに変更
  changeOrigin: true,
  pathRewrite: {
    "^/api": "",
  },
}));

// WebSocket サーバー
const server = require("http").createServer(app);
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("WebSocket client connected");

  ws.on("message", (msg) => {
    console.log("Received:", msg.toString());
    ws.send(`Echo: ${msg}`);
  });

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
  });
});

// サーバー起動
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
