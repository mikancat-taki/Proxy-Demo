"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cors_1 = require("cors");
const http_proxy_middleware_1 = require("http-proxy-middleware");
const compression_1 = require("compression");

const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use((0, cors_1.default)());
app.use((0, compression_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));

// テスト用ルート
app.get("/", (_req, res) => {
    res.send("Proxy server is running!");
});

// プロキシ設定例
app.use("/api", (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: "https://example.com", // 実際にプロキシしたいURLに変更
    changeOrigin: true,
    pathRewrite: {
        "^/api": "",
    },
}));

// サーバー起動
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

exports.default = app;
